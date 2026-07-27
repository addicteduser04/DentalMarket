-- Complete administrator product profile. Additive migration only.

alter table public.products
  add column if not exists sku text,
  add column if not exists brand text,
  add column if not exists product_type text,
  add column if not exists short_summary text,
  add column if not exists technical_specs jsonb not null default '{}'::jsonb,
  add column if not exists condition text not null default 'new'
    check (condition in ('new', 'refurbished')),
  add column if not exists warranty text,
  add column if not exists image_metadata jsonb not null default '[]'::jsonb,
  add column if not exists price_mode text not null default 'fixed'
    check (price_mode in ('fixed', 'contact')),
  add column if not exists promotional_price numeric(10,2),
  add column if not exists promotion_starts_at timestamptz,
  add column if not exists promotion_ends_at timestamptz,
  add column if not exists stock_tracking boolean not null default false,
  add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0),
  add column if not exists low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  add column if not exists availability_status text not null default 'in_stock'
    check (availability_status in ('in_stock', 'low_stock', 'out_of_stock', 'on_order', 'unavailable')),
  add column if not exists preparation_time text,
  add column if not exists internal_stock_note text,
  add column if not exists publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  add column if not exists search_visible boolean not null default true,
  add column if not exists catalog_visible boolean not null default true,
  add column if not exists published_at timestamptz,
  add column if not exists delivery_eligible boolean not null default true
    check (delivery_eligible = true),
  add column if not exists delivery_note text,
  add column if not exists pickup_available boolean not null default false,
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists og_image_url text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create unique index if not exists products_sku_unique_idx
  on public.products (lower(sku)) where sku is not null and sku <> '';
create index if not exists products_publication_idx
  on public.products(publication_status, catalog_visible, search_visible);

-- Preserve the visibility of already-approved active catalogue records.
update public.products
set publication_status = 'published',
    published_at = coalesce(published_at, created_at),
    availability_status = stock_status
where is_active = true
  and publication_status = 'draft';

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select to anon, authenticated
  using (
    is_active = true
    and publication_status = 'published'
    and catalog_visible = true
  );

-- Product writes remain restricted by the existing private.is_admin() RLS
-- policies and authenticated table grants.
