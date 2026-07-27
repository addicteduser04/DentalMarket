-- Add sale-level discounts without rewriting the applied sales migration.
-- The v2 RPC wraps the existing atomic inventory transaction and then applies
-- the server-validated global discount in the same database transaction.

alter table public.sales
  add column if not exists order_discount numeric(12,2) not null default 0
    check (order_discount >= 0);

create or replace function private.prevent_cancelled_sale_reopening()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.sale_status = 'cancelled' and new.sale_status <> 'cancelled' then
    raise exception using errcode = '22023', message = 'A cancelled sale cannot be reopened';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_prevent_reopening on public.sales;
create trigger sales_prevent_reopening
before update of sale_status on public.sales
for each row execute function private.prevent_cancelled_sale_reopening();

create or replace function public.save_manual_sale_v2(
  p_sale_id uuid,
  p_sale jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  requested_discount numeric(12,2) :=
    round(greatest(coalesce((p_sale->>'order_discount')::numeric, 0), 0), 2);
  sale_subtotal numeric(12,2);
  line_discount numeric(12,2);
  delivery numeric(12,2);
  paid numeric(12,2);
  payment_state text;
  final_total numeric(12,2);
begin
  if auth.uid() is null or not (select private.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  target_id := public.save_manual_sale(p_sale_id, p_sale, p_items);

  select subtotal, discount_total, delivery_charge, amount_paid, payment_status
  into sale_subtotal, line_discount, delivery, paid, payment_state
  from public.sales
  where id = target_id
  for update;

  if requested_discount > sale_subtotal - line_discount then
    raise exception using errcode = '22023', message = 'Invalid global discount';
  end if;

  final_total := round(sale_subtotal - line_discount - requested_discount + delivery, 2);
  if paid > final_total and payment_state <> 'refunded' then
    raise exception using errcode = '22023', message = 'Amount paid exceeds sale total';
  end if;

  update public.sales
  set order_discount = requested_discount,
      total_amount = final_total,
      balance_due = case when payment_state = 'refunded' then 0 else final_total - paid end
  where id = target_id;

  return target_id;
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid sale data';
end;
$$;

revoke all on function public.save_manual_sale(uuid, jsonb, jsonb) from authenticated;
revoke all on function public.save_manual_sale_v2(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_manual_sale_v2(uuid, jsonb, jsonb) to authenticated;

