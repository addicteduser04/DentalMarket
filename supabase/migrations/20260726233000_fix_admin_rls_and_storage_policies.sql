-- Repair recursive admin checks and ensure the product image bucket has
-- narrowly scoped public-read/admin-write policies.
-- This migration intentionally does not alter application data.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

-- TABLE PRIVILEGES
-- RLS policies filter these grants; customers receive no unrestricted access.
grant select on table public.profiles to authenticated;

grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

grant insert on table public.cart_submissions to anon, authenticated;
grant select on table public.cart_submissions to authenticated;

grant select on table public.offers to anon, authenticated;
grant insert, update, delete on table public.offers to authenticated;

grant select on table public.campaigns to anon, authenticated;
grant insert, update, delete on table public.campaigns to authenticated;

-- PROFILES
-- Profile roles are assigned manually by trusted SQL only. Authenticated users
-- may update the customer-editable columns, subject to profiles_update_own RLS.
revoke update on table public.profiles from authenticated;
grant update (full_name, phone, user_type) on table public.profiles to authenticated;

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_admin()));

-- CATEGORIES
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- PRODUCTS
drop policy if exists "products_admin_read_all" on public.products;
create policy "products_admin_read_all"
  on public.products
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
  on public.products
  for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products
  for delete
  to authenticated
  using ((select private.is_admin()));

-- CART SUBMISSION ANALYTICS
drop policy if exists "cart_submissions_insert" on public.cart_submissions;
create policy "cart_submissions_insert"
  on public.cart_submissions
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = (select auth.uid())
  );

drop policy if exists "cart_submissions_admin_read" on public.cart_submissions;
create policy "cart_submissions_admin_read"
  on public.cart_submissions
  for select
  to authenticated
  using ((select private.is_admin()));

-- OFFERS
drop policy if exists "offers_admin_all" on public.offers;
create policy "offers_admin_all"
  on public.offers
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- CAMPAIGNS
drop policy if exists "campaigns_admin_all" on public.campaigns;
create policy "campaigns_admin_all"
  on public.campaigns
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- STORAGE
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin())
  );

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin())
  )
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin())
  );

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin())
  );
