-- Administrator-only manual WhatsApp sales.
-- Keeps commercial sales separate from cart_submissions (customer requests).

create sequence if not exists public.sale_reference_seq;

create or replace function public.generate_sale_reference()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'DN-' || to_char(current_date, 'YYYYMM') || '-' ||
    lpad(nextval('public.sale_reference_seq')::text, 5, '0')
$$;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_sale_reference(),
  sale_at timestamptz not null default now(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^[0-9+ ()-]{8,24}$'),
  delivery_address text not null check (char_length(trim(delivery_address)) between 4 and 300),
  neighbourhood text not null check (char_length(trim(neighbourhood)) between 2 and 100),
  customer_note text,
  whatsapp_reference text,
  internal_note text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  delivery_charge numeric(12,2) not null default 0 check (delivery_charge >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12,2) not null default 0 check (balance_due >= 0),
  payment_method text not null default 'cash'
    check (payment_method in ('cash','bank_transfer','cash_on_delivery','other')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','partially_paid','paid','refunded')),
  delivery_status text not null default 'awaiting_preparation'
    check (delivery_status in ('awaiting_preparation','ready','out_for_delivery','delivered','cancelled')),
  sale_status text not null default 'draft'
    check (sale_status in ('draft','confirmed','cancelled')),
  inventory_applied boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= total_amount or payment_status = 'refunded')
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  variation_id text,
  product_name text not null check (char_length(trim(product_name)) between 1 and 180),
  variation_label text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  check ((is_custom and product_id is null and variation_id is null) or
         (not is_custom and product_id is not null)),
  check (discount_amount <= unit_price * quantity)
);

create index if not exists sales_sale_at_idx on public.sales(sale_at desc);
create index if not exists sales_customer_idx on public.sales(lower(customer_name), customer_phone);
create index if not exists sales_status_idx on public.sales(sale_status, payment_status, delivery_status);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_idx on public.sale_items(product_id);

drop trigger if exists sales_updated_at on public.sales;
create trigger sales_updated_at before update on public.sales
for each row execute procedure public.set_updated_at();

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "sales_admin_select" on public.sales for select to authenticated
  using ((select private.is_admin()));
create policy "sale_items_admin_select" on public.sale_items for select to authenticated
  using ((select private.is_admin()));

revoke all on public.sales from anon, authenticated;
revoke all on public.sale_items from anon, authenticated;
grant select on public.sales, public.sale_items to authenticated;
revoke all on sequence public.sale_reference_seq from anon, authenticated;

create or replace function private.apply_sale_inventory(p_sale_id uuid, p_direction integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  product_row public.products%rowtype;
  variation_index integer;
  variation_stock integer;
begin
  if p_direction not in (-1, 1) then
    raise exception using errcode = '22023', message = 'Invalid inventory direction';
  end if;

  for item in
    select * from public.sale_items
    where sale_id = p_sale_id and not is_custom
    order by product_id
  loop
    select * into product_row
    from public.products
    where id = item.product_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'A catalogue product is unavailable';
    end if;

    if item.variation_id is not null then
      select (entry.ordinality - 1)::integer,
             coalesce((entry.value->>'stock_quantity')::integer, 0)
      into variation_index, variation_stock
      from jsonb_array_elements(product_row.variations) with ordinality entry(value, ordinality)
      where entry.value->>'id' = item.variation_id
      limit 1;

      if variation_index is null then
        raise exception using errcode = 'P0001', message = 'The selected variation is unavailable';
      end if;
      if p_direction = -1 and variation_stock < item.quantity then
        raise exception using errcode = 'P0001', message = 'Insufficient variation stock';
      end if;

      update public.products
      set variations = jsonb_set(
        variations,
        array[variation_index::text, 'stock_quantity'],
        to_jsonb(variation_stock + (p_direction * item.quantity)),
        false
      )
      where id = item.product_id;
    elsif product_row.stock_tracking then
      if p_direction = -1 and product_row.stock_quantity < item.quantity then
        raise exception using errcode = 'P0001', message = 'Insufficient product stock';
      end if;
      update public.products
      set stock_quantity = stock_quantity + (p_direction * item.quantity)
      where id = item.product_id;
    end if;
  end loop;
end;
$$;

create or replace function public.save_manual_sale(
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
  actor uuid := auth.uid();
  target_id uuid;
  previous_status text;
  was_applied boolean := false;
  requested_status text := coalesce(p_sale->>'sale_status', 'draft');
  item jsonb;
  catalogue_product public.products%rowtype;
  selected_variation jsonb;
  item_name text;
  item_variation_label text;
  item_quantity integer;
  item_unit_price numeric(12,2);
  item_discount numeric(12,2);
  computed_subtotal numeric(12,2) := 0;
  computed_discount numeric(12,2) := 0;
  computed_delivery numeric(12,2) := greatest(coalesce((p_sale->>'delivery_charge')::numeric, 0), 0);
  computed_total numeric(12,2);
  paid numeric(12,2) := greatest(coalesce((p_sale->>'amount_paid')::numeric, 0), 0);
begin
  if actor is null or not (select private.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'At least one sale item is required';
  end if;
  if requested_status not in ('draft','confirmed','cancelled') then
    raise exception using errcode = '22023', message = 'Invalid sale status';
  end if;

  if p_sale_id is not null then
    select sale_status, inventory_applied
    into previous_status, was_applied
    from public.sales where id = p_sale_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Sale not found';
    end if;
    target_id := p_sale_id;
    if was_applied then
      perform private.apply_sale_inventory(target_id, 1);
    end if;
    delete from public.sale_items where sale_id = target_id;
  else
    insert into public.sales (
      customer_name, customer_phone, delivery_address, neighbourhood,
      created_by, updated_by
    ) values (
      trim(p_sale->>'customer_name'), trim(p_sale->>'customer_phone'),
      trim(p_sale->>'delivery_address'), trim(p_sale->>'neighbourhood'),
      actor, actor
    ) returning id into target_id;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := coalesce((item->>'quantity')::integer, 0);
    item_unit_price := round(coalesce((item->>'unit_price')::numeric, 0), 2);
    item_discount := round(coalesce((item->>'discount_amount')::numeric, 0), 2);
    if item_quantity <= 0 or item_unit_price < 0 or item_discount < 0
       or item_discount > item_unit_price * item_quantity then
      raise exception using errcode = '22023', message = 'Invalid sale item values';
    end if;

    if coalesce((item->>'is_custom')::boolean, false) then
      item_name := trim(item->>'product_name');
      item_variation_label := null;
      if item_name = '' then
        raise exception using errcode = '22023', message = 'Custom item name is required';
      end if;
      insert into public.sale_items (
        sale_id, product_name, quantity, unit_price, discount_amount,
        line_total, is_custom
      ) values (
        target_id, item_name, item_quantity, item_unit_price, item_discount,
        round(item_quantity * item_unit_price - item_discount, 2), true
      );
    else
      select * into catalogue_product
      from public.products where id = (item->>'product_id')::uuid for update;
      if not found then
        raise exception using errcode = 'P0001', message = 'A catalogue product is unavailable';
      end if;
      item_name := catalogue_product.name;
      item_variation_label := null;
      if nullif(item->>'variation_id', '') is not null then
        select entry.value into selected_variation
        from jsonb_array_elements(catalogue_product.variations) entry(value)
        where entry.value->>'id' = item->>'variation_id'
          and coalesce((entry.value->>'is_active')::boolean, true)
        limit 1;
        if selected_variation is null then
          raise exception using errcode = 'P0001', message = 'The selected variation is unavailable';
        end if;
        item_variation_label := selected_variation->>'label';
      end if;
      insert into public.sale_items (
        sale_id, product_id, variation_id, product_name, variation_label,
        quantity, unit_price, discount_amount, line_total, is_custom
      ) values (
        target_id, catalogue_product.id, nullif(item->>'variation_id', ''),
        item_name, item_variation_label, item_quantity, item_unit_price,
        item_discount, round(item_quantity * item_unit_price - item_discount, 2), false
      );
    end if;
    computed_subtotal := computed_subtotal + item_quantity * item_unit_price;
    computed_discount := computed_discount + item_discount;
  end loop;

  computed_total := round(computed_subtotal - computed_discount + computed_delivery, 2);
  if paid > computed_total and coalesce(p_sale->>'payment_status','unpaid') <> 'refunded' then
    raise exception using errcode = '22023', message = 'Amount paid exceeds sale total';
  end if;

  update public.sales set
    sale_at = coalesce((p_sale->>'sale_at')::timestamptz, now()),
    customer_name = trim(p_sale->>'customer_name'),
    customer_phone = trim(p_sale->>'customer_phone'),
    delivery_address = trim(p_sale->>'delivery_address'),
    neighbourhood = trim(p_sale->>'neighbourhood'),
    customer_note = nullif(trim(p_sale->>'customer_note'), ''),
    whatsapp_reference = nullif(trim(p_sale->>'whatsapp_reference'), ''),
    internal_note = nullif(trim(p_sale->>'internal_note'), ''),
    subtotal = round(computed_subtotal, 2),
    discount_total = round(computed_discount, 2),
    delivery_charge = computed_delivery,
    total_amount = computed_total,
    amount_paid = paid,
    balance_due = case when coalesce(p_sale->>'payment_status','unpaid') = 'refunded'
      then 0 else computed_total - paid end,
    payment_method = p_sale->>'payment_method',
    payment_status = p_sale->>'payment_status',
    delivery_status = p_sale->>'delivery_status',
    sale_status = requested_status,
    inventory_applied = false,
    updated_by = actor
  where id = target_id;

  if requested_status = 'confirmed' then
    perform private.apply_sale_inventory(target_id, -1);
    update public.sales set inventory_applied = true where id = target_id;
  end if;

  return target_id;
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid sale data';
end;
$$;

revoke all on function public.save_manual_sale(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_manual_sale(uuid, jsonb, jsonb) to authenticated;
revoke all on function private.apply_sale_inventory(uuid, integer) from public, anon, authenticated;

