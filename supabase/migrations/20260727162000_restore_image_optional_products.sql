-- Product images were not historically mandatory. Restore products that were
-- published before the strict image-readiness constraint demoted them.

alter table public.products
  drop constraint if exists products_publication_ready;

update public.products
set publication_status = 'published',
    is_active = true
where publication_status = 'draft'
  and is_active = false
  and published_at is not null
  and jsonb_array_length(image_metadata) = 0;

alter table public.products
  add constraint products_publication_ready
    check (
      publication_status <> 'published'
      or (
        category_id is not null
        and availability_status <> 'unavailable'
        and (price_mode = 'contact' or price >= 0)
      )
    );
