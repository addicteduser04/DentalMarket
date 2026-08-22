-- Reconcile superseded local delivery/rate-limit work with the deployed
-- browser -> RLS-protected cart submission architecture.

alter table public.delivery_addresses
  drop constraint if exists delivery_addresses_city_check,
  alter column city drop default;

alter table public.delivery_addresses
  add constraint delivery_addresses_city_check check (length(trim(city)) > 0);

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
  alter column delivery_city drop default,
  drop constraint if exists cart_submissions_delivery_city_check;

alter table public.cart_submissions
  add constraint cart_submissions_delivery_city_check
  check (delivery_city is not null and length(trim(delivery_city)) > 0);

-- The fingerprint architecture was abandoned. Submissions are intentionally
-- direct permitted inserts and cannot be publicly enumerated.
drop function if exists public.check_cart_submission_rate_limit(text, integer, integer);
drop index if exists public.cart_submissions_fingerprint_created_idx;
alter table public.cart_submissions drop column if exists client_fingerprint;

-- Pack rows need to know whether a linked product has a reachable normal
-- catalogue detail page. This flag controls linking only; it does not broaden
-- product visibility or return unrelated products.
create or replace function public.get_public_student_pack_products(v_pack_slug text)
returns table(component_id uuid, product jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    component.id as component_id,
    jsonb_build_object(
      'id', product.id,
      'name', product.name,
      'slug', product.slug,
      'price', product.price,
      'compare_at_price', product.compare_at_price,
      'category_id', product.category_id,
      'images', product.images,
      'stock_status', product.stock_status,
      'target_audience', product.target_audience,
      'variations', product.variations,
      'is_active', product.is_active,
      'catalog_visible', product.catalog_visible,
      'sku', product.sku,
      'brand', product.brand,
      'price_mode', product.price_mode,
      'promotional_price', product.promotional_price,
      'promotion_starts_at', product.promotion_starts_at,
      'promotion_ends_at', product.promotion_ends_at,
      'stock_tracking', product.stock_tracking,
      'stock_quantity', product.stock_quantity,
      'availability_status', product.availability_status,
      'publication_status', product.publication_status
    ) as product
  from public.student_packs as pack
  join public.universities as university
    on university.id = pack.university_id
   and university.is_active = true
  join public.student_pack_components as component
    on component.pack_id = pack.id
  join public.products as product
    on product.id = component.product_id
   and product.is_active = true
   and product.publication_status = 'published'
  where pack.slug = v_pack_slug
    and pack.publication_status = 'published';
$$;

revoke all on function public.get_public_student_pack_products(text) from public;
grant execute on function public.get_public_student_pack_products(text) to anon, authenticated;
