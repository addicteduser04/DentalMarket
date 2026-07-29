-- Source-backed university/year recommendations are distinct from fixed packs.
-- They reference the existing catalogue and never duplicate products or variations.

create table public.student_recommended_products (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variation_id text,
  source_url text not null,
  source_product_url text not null,
  import_source text not null,
  import_key text not null,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_recommended_products_identity unique (import_source, import_key),
  constraint student_recommended_products_relationship unique (
    university_id, academic_year_id, product_id
  )
);

create index student_recommended_products_public_idx
  on public.student_recommended_products(university_id, academic_year_id, is_active, display_order);

create trigger student_recommended_products_updated_at
before update on public.student_recommended_products
for each row execute procedure public.set_updated_at();

create trigger validate_student_recommendation_variation
before insert or update of product_id, variation_id on public.student_recommended_products
for each row execute procedure private.validate_pack_component_variation();

alter table public.student_recommended_products enable row level security;

grant select on public.student_recommended_products to anon, authenticated;
grant insert, update, delete on public.student_recommended_products to authenticated;

create policy student_recommended_products_public_read
on public.student_recommended_products for select to anon, authenticated
using (
  is_active
  and exists (
    select 1 from public.universities u
    where u.id = university_id and u.is_active
  )
  and exists (
    select 1 from public.academic_years ay
    where ay.id = academic_year_id and ay.is_active
  )
  and exists (
    select 1 from public.products p
    where p.id = product_id
      and p.is_active
      and p.publication_status = 'published'
      and p.catalog_visible
  )
);

create policy student_recommended_products_admin_read_all
on public.student_recommended_products for select to authenticated
using ((select private.is_admin()));

create policy student_recommended_products_admin_write
on public.student_recommended_products for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create table private.student_recommendation_import_runs (
  id uuid primary key default gen_random_uuid(),
  import_source text not null,
  source_digest text not null,
  page_count integer not null,
  relationship_count integer not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);

revoke all on private.student_recommendation_import_runs
from public, anon, authenticated;

create or replace function public.import_student_recommendations(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run uuid;
  item jsonb;
  v_university uuid;
  v_year uuid;
  v_product uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if jsonb_typeof(payload->'recommendations') <> 'array' then
    raise exception using errcode = '22023', message = 'Recommendation payload is invalid';
  end if;

  insert into private.student_recommendation_import_runs(
    import_source, source_digest, page_count, relationship_count
  ) values (
    payload->>'import_source',
    payload->>'source_digest',
    (payload->>'page_count')::integer,
    jsonb_array_length(payload->'recommendations')
  ) returning id into v_run;

  for item in select value from jsonb_array_elements(payload->'recommendations') loop
    select id into v_university from public.universities
      where slug = item->>'university_slug';
    select id into v_year from public.academic_years
      where code = item->>'academic_year_code';
    select id into v_product from public.products
      where source_metadata->>'source_url' = item->>'source_product_url';

    if v_university is null or v_year is null or v_product is null then
      raise exception using errcode = '23503',
        message = 'Recommendation relationship could not be resolved';
    end if;

    if exists (
      select 1 from public.student_recommended_products
      where import_source = payload->>'import_source'
        and import_key = item->>'import_key'
    ) then
      v_updated := v_updated + 1;
    else
      v_inserted := v_inserted + 1;
    end if;

    insert into public.student_recommended_products(
      university_id, academic_year_id, product_id, variation_id,
      source_url, source_product_url, import_source, import_key,
      display_order, is_active, source_metadata
    ) values (
      v_university, v_year, v_product, nullif(item->>'variation_id', ''),
      item->>'source_url', item->>'source_product_url',
      payload->>'import_source', item->>'import_key',
      (item->>'display_order')::integer, true,
      coalesce(item->'source_metadata', '{}'::jsonb)
    )
    on conflict (import_source, import_key) do update set
      university_id = excluded.university_id,
      academic_year_id = excluded.academic_year_id,
      product_id = excluded.product_id,
      variation_id = excluded.variation_id,
      source_url = excluded.source_url,
      source_product_url = excluded.source_product_url,
      display_order = excluded.display_order,
      source_metadata = excluded.source_metadata;
  end loop;

  update private.student_recommendation_import_runs
  set inserted_count = v_inserted, updated_count = v_updated, completed_at = now()
  where id = v_run;

  return jsonb_build_object(
    'run_id', v_run,
    'inserted', v_inserted,
    'updated', v_updated,
    'relationships', jsonb_array_length(payload->'recommendations')
  );
end;
$$;

revoke all on function public.import_student_recommendations(jsonb)
from public, anon, authenticated;
grant execute on function public.import_student_recommendations(jsonb) to service_role;

create or replace function public.rollback_student_recommendation_import(target_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_deleted integer;
begin
  select import_source into v_source
  from private.student_recommendation_import_runs
  where id = target_run and rolled_back_at is null;

  if v_source is null then
    raise exception using errcode = 'P0002', message = 'Import run not found';
  end if;

  delete from public.student_recommended_products
  where import_source = v_source;
  get diagnostics v_deleted = row_count;

  update private.student_recommendation_import_runs
  set rolled_back_at = now()
  where id = target_run;

  return jsonb_build_object('run_id', target_run, 'deleted', v_deleted);
end;
$$;

revoke all on function public.rollback_student_recommendation_import(uuid)
from public, anon, authenticated;
grant execute on function public.rollback_student_recommendation_import(uuid) to service_role;
