-- Atomic, auditable DENTANOVA catalogue imports.
-- Existing operational rows are never deleted by this migration or its RPCs.

alter table public.products
  add column if not exists import_source text,
  add column if not exists import_key text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists products_import_key_unique_idx
  on public.products(import_source, import_key)
  where import_source is not null and import_key is not null;

create table if not exists private.catalogue_import_runs (
  id uuid primary key default gen_random_uuid(),
  import_source text not null,
  source_digest text not null,
  source_product_count integer not null,
  source_variation_count integer not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);

create table if not exists private.catalogue_import_snapshots (
  run_id uuid not null references private.catalogue_import_runs(id) on delete restrict,
  product_id uuid not null,
  existed_before boolean not null,
  row_before jsonb,
  primary key (run_id, product_id)
);

revoke all on private.catalogue_import_runs from public, anon, authenticated;
revoke all on private.catalogue_import_snapshots from public, anon, authenticated;

create or replace function public.import_dentanova_catalogue(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  item jsonb;
  category_id uuid;
  existing_id uuid;
  product_id uuid;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
begin
  if jsonb_typeof(payload->'products') <> 'array'
     or (payload->>'source_product_count')::integer <> jsonb_array_length(payload->'products')
     or (payload->>'source_product_count')::integer <> 196
     or (payload->>'source_variation_count')::integer <> 607 then
    raise exception using errcode = '22023', message = 'Catalogue source counts are invalid';
  end if;

  insert into private.catalogue_import_runs (
    import_source, source_digest, source_product_count, source_variation_count
  ) values (
    payload->>'import_source', payload->>'source_digest',
    (payload->>'source_product_count')::integer,
    (payload->>'source_variation_count')::integer
  ) returning id into run_id;

  for item in select value from jsonb_array_elements(payload->'products')
  loop
    insert into public.categories(name, slug)
    values (item->>'category_name', item->>'category_slug')
    on conflict (slug) do update set name = excluded.name
    returning id into category_id;

    select id into existing_id
    from public.products
    where (import_source = payload->>'import_source' and import_key = item->>'import_key')
       or (nullif(item->>'sku', '') is not null and lower(sku) = lower(item->>'sku'))
    order by (import_source = payload->>'import_source' and import_key = item->>'import_key') desc
    limit 1
    for update;

    if existing_id is not null then
      insert into private.catalogue_import_snapshots(run_id, product_id, existed_before, row_before)
      select run_id, existing_id, true, to_jsonb(p) from public.products p where p.id = existing_id;
      product_id := existing_id;
      v_updated_count := v_updated_count + 1;
    else
      product_id := gen_random_uuid();
      insert into private.catalogue_import_snapshots(run_id, product_id, existed_before)
      values (run_id, product_id, false);
      v_inserted_count := v_inserted_count + 1;
    end if;

    insert into public.products (
      id, name, slug, description, price, compare_at_price, category_id, images,
      stock_status, target_audience, variations, is_active, is_featured, sku,
      brand, product_type, short_summary, technical_specs, image_metadata,
      promotional_price, stock_tracking, stock_quantity, availability_status,
      publication_status, search_visible, catalog_visible, published_at,
      seo_title, meta_description, og_image_url, import_source, import_key,
      source_metadata
    ) values (
      product_id, item->>'name', item->>'slug', nullif(item->>'description',''),
      (item->>'price')::numeric, nullif(item->>'compare_at_price','')::numeric,
      category_id, array(select jsonb_array_elements_text(coalesce(item->'images','[]'::jsonb))),
      item->>'stock_status', 'both', coalesce(item->'variations','[]'::jsonb),
      (item->>'is_active')::boolean, false, nullif(item->>'sku',''),
      nullif(item->>'brand',''), item->>'product_type',
      nullif(item->>'short_summary',''), coalesce(item->'technical_specs','{}'::jsonb),
      coalesce(item->'image_metadata','[]'::jsonb),
      nullif(item->>'promotional_price','')::numeric,
      (item->>'stock_tracking')::boolean, (item->>'stock_quantity')::integer,
      item->>'availability_status', item->>'publication_status',
      true, true,
      case when item->>'publication_status' = 'published' then now() else null end,
      item->>'name', nullif(item->>'meta_description',''),
      nullif(item->>'og_image_url',''), payload->>'import_source',
      item->>'import_key', coalesce(item->'source_metadata','{}'::jsonb)
    )
    on conflict (id) do update set
      name=excluded.name, slug=excluded.slug, description=excluded.description,
      price=excluded.price, compare_at_price=excluded.compare_at_price,
      category_id=excluded.category_id, images=excluded.images,
      stock_status=excluded.stock_status, variations=excluded.variations,
      is_active=excluded.is_active, sku=excluded.sku, brand=excluded.brand,
      product_type=excluded.product_type, short_summary=excluded.short_summary,
      technical_specs=excluded.technical_specs, image_metadata=excluded.image_metadata,
      promotional_price=excluded.promotional_price,
      stock_tracking=excluded.stock_tracking, stock_quantity=excluded.stock_quantity,
      availability_status=excluded.availability_status,
      publication_status=excluded.publication_status,
      search_visible=excluded.search_visible, catalog_visible=excluded.catalog_visible,
      published_at=coalesce(public.products.published_at, excluded.published_at),
      seo_title=excluded.seo_title, meta_description=excluded.meta_description,
      og_image_url=excluded.og_image_url, import_source=excluded.import_source,
      import_key=excluded.import_key, source_metadata=excluded.source_metadata;
  end loop;

  update private.catalogue_import_runs
  set inserted_count = v_inserted_count, updated_count = v_updated_count, completed_at = now()
  where id = run_id;

  return jsonb_build_object(
    'run_id', run_id, 'inserted', v_inserted_count, 'updated', v_updated_count,
    'processed_products', (payload->>'source_product_count')::integer,
    'processed_variations', (payload->>'source_variation_count')::integer
  );
end;
$$;

revoke all on function public.import_dentanova_catalogue(jsonb) from public, anon, authenticated;
grant execute on function public.import_dentanova_catalogue(jsonb) to service_role;

create or replace function public.rollback_dentanova_catalogue_import(target_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot record;
  restored integer := 0;
  archived integer := 0;
begin
  if not exists (
    select 1 from private.catalogue_import_runs
    where id = target_run_id and completed_at is not null and rolled_back_at is null
  ) then
    raise exception using errcode = '22023', message = 'Import run cannot be rolled back';
  end if;

  for snapshot in
    select * from private.catalogue_import_snapshots where run_id = target_run_id
  loop
    if snapshot.existed_before then
      update public.products p set
        name=x.name, slug=x.slug, description=x.description, price=x.price,
        compare_at_price=x.compare_at_price, category_id=x.category_id, images=x.images,
        stock_status=x.stock_status, target_audience=x.target_audience,
        variations=x.variations, is_active=x.is_active, is_featured=x.is_featured,
        sku=x.sku, brand=x.brand, product_type=x.product_type,
        short_summary=x.short_summary, technical_specs=x.technical_specs,
        image_metadata=x.image_metadata, promotional_price=x.promotional_price,
        stock_tracking=x.stock_tracking, stock_quantity=x.stock_quantity,
        availability_status=x.availability_status,
        publication_status=x.publication_status, search_visible=x.search_visible,
        catalog_visible=x.catalog_visible, published_at=x.published_at,
        seo_title=x.seo_title, meta_description=x.meta_description,
        og_image_url=x.og_image_url, import_source=x.import_source,
        import_key=x.import_key, source_metadata=x.source_metadata
      from jsonb_populate_record(null::public.products, snapshot.row_before) x
      where p.id = snapshot.product_id;
      restored := restored + 1;
    else
      -- Preserve favourites/sales and audit history: imported-only rows are archived.
      update public.products set publication_status='archived', is_active=false,
        catalog_visible=false, search_visible=false
      where id = snapshot.product_id;
      archived := archived + 1;
    end if;
  end loop;

  update private.catalogue_import_runs set rolled_back_at=now() where id=target_run_id;
  return jsonb_build_object('run_id',target_run_id,'restored',restored,'archived',archived);
end;
$$;

revoke all on function public.rollback_dentanova_catalogue_import(uuid) from public, anon, authenticated;
grant execute on function public.rollback_dentanova_catalogue_import(uuid) to service_role;
