-- Remove the explicitly labelled test catalogue records from production views.
-- Preserve the product row for audit/history; remove only the now-empty test
-- category, whose foreign key uses ON DELETE SET NULL.

update public.products
set publication_status = 'archived',
    is_active = false,
    catalog_visible = false,
    search_visible = false
where lower(name) = 'test product'
  and slug = 'test-product';

delete from public.categories
where lower(name) = 'test category'
  and slug = 'test-category'
  and not exists (
    select 1
    from public.products
    where category_id = public.categories.id
      and not (lower(name) = 'test product' and slug = 'test-product')
  );

