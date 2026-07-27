-- Server-side product validation. Kept separate because the product-profile
-- migration has already been applied.

update public.products
set image_metadata = (
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'url', image_url,
      'alt', coalesce(nullif(public.products.name, ''), 'Produit DENTALNOVA'),
      'is_main', ordinal = 1
    ) order by ordinal),
    '[]'::jsonb
  )
  from unnest(public.products.images) with ordinality as source(image_url, ordinal)
)
where jsonb_array_length(image_metadata) = 0
  and cardinality(images) > 0;

-- A legacy active record that has no usable main image becomes a safe draft.
update public.products
set publication_status = 'draft',
    is_active = false
where publication_status = 'published'
  and jsonb_array_length(image_metadata) = 0;

alter table public.products
  add constraint products_price_nonnegative
    check (price >= 0),
  add constraint products_promotional_price_valid
    check (
      promotional_price is null
      or (promotional_price >= 0 and promotional_price < price)
    ),
  add constraint products_promotion_dates_valid
    check (
      promotion_starts_at is null
      or promotion_ends_at is null
      or promotion_ends_at > promotion_starts_at
    ),
  add constraint products_publication_ready
    check (
      publication_status <> 'published'
      or (
        category_id is not null
        and availability_status <> 'unavailable'
        and jsonb_array_length(image_metadata) > 0
        and (price_mode = 'contact' or price >= 0)
      )
    );
