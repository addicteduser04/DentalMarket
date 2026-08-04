alter table public.delivery_addresses
  drop constraint if exists delivery_addresses_city_check,
  alter column city drop default;

drop policy if exists "delivery_addresses_insert_own" on public.delivery_addresses;
drop policy if exists "delivery_addresses_update_own" on public.delivery_addresses;

create policy "delivery_addresses_insert_own"
  on public.delivery_addresses for insert to authenticated
  with check (user_id = (select auth.uid()) and length(trim(city)) > 0);

create policy "delivery_addresses_update_own"
  on public.delivery_addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and length(trim(city)) > 0);

alter table public.cart_submissions
  drop constraint if exists cart_submissions_delivery_city_check,
  alter column delivery_city set default 'Partout au Maroc';
