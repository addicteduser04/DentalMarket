-- Resolve pack-only products without broadening the public products RLS policy.
-- A caller can only retrieve active, published products linked to a published
-- pack whose university is active. Catalogue visibility remains independent.

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

comment on function public.get_public_student_pack_products(text) is
  'Returns storefront-safe products linked to one public student pack, including catalog-hidden pack-only products.';
