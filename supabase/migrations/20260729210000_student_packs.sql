-- Normalized, RLS-protected DENTANOVA student packs.
-- Packs reference the existing catalogue; products and variations are never copied.

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  name text not null,
  acronym text not null,
  city text not null,
  slug text not null unique,
  description text,
  image_url text,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label_fr text not null,
  label_ar text not null,
  display_order integer not null check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_packs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  existing_product_id uuid unique references public.products(id) on delete restrict,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  image_url text,
  gallery text[] not null default '{}',
  pack_code text unique,
  source_id text unique,
  source_url text,
  import_source text,
  import_key text,
  academic_session text,
  manual_price numeric(12,2) check (manual_price is null or manual_price >= 0),
  component_total numeric(12,2) check (component_total is null or component_total >= 0),
  promotional_price numeric(12,2) check (promotional_price is null or promotional_price >= 0),
  promotion_starts_at timestamptz,
  promotion_ends_at timestamptz,
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','archived')),
  availability_strategy text not null default 'components'
    check (availability_strategy in ('components','manual')),
  availability_override text
    check (availability_override is null or availability_override in ('in_stock','out_of_stock','on_order')),
  stock_quantity_override integer check (stock_quantity_override is null or stock_quantity_override >= 0),
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  seo_title text,
  meta_description text check (meta_description is null or char_length(meta_description) <= 160),
  source_metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_packs_import_identity unique (import_source, import_key),
  constraint student_packs_promotion_dates check (
    promotion_ends_at is null or promotion_starts_at is null or promotion_ends_at > promotion_starts_at
  ),
  constraint student_packs_promotion_price check (
    promotional_price is null or manual_price is null or promotional_price < manual_price
  )
);

create table public.student_pack_components (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.student_packs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variation_id text,
  source_bundle_item_id text,
  quantity integer not null check (quantity > 0),
  is_required boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  notes text,
  replacement_policy text not null default 'none'
    check (replacement_policy in ('none','admin_approved','equivalent')),
  price_snapshot numeric(12,2) check (price_snapshot is null or price_snapshot >= 0),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_id, source_bundle_item_id)
);

create table public.student_pack_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id uuid not null references public.student_packs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create index universities_active_order_idx on public.universities(is_active, display_order);
create index student_packs_public_idx on public.student_packs(publication_status, university_id, academic_year_id);
create index student_pack_components_pack_order_idx on public.student_pack_components(pack_id, display_order);
create index student_pack_components_product_idx on public.student_pack_components(product_id);
create index student_pack_favorites_user_idx on public.student_pack_favorites(user_id, created_at desc);

create trigger universities_updated_at before update on public.universities
for each row execute procedure public.set_updated_at();
create trigger academic_years_updated_at before update on public.academic_years
for each row execute procedure public.set_updated_at();
create trigger student_packs_updated_at before update on public.student_packs
for each row execute procedure public.set_updated_at();
create trigger student_pack_components_updated_at before update on public.student_pack_components
for each row execute procedure public.set_updated_at();

create or replace function private.validate_pack_component_variation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.variation_id is not null and not exists (
    select 1 from public.products p
    cross join lateral jsonb_array_elements(coalesce(p.variations, '[]'::jsonb)) v
    where p.id = new.product_id
      and (v->>'id' = new.variation_id or v->>'source_id' = new.variation_id)
  ) then
    raise exception using errcode='23514', message='Pack variation does not belong to product';
  end if;
  return new;
end;
$$;

create trigger validate_pack_component_variation
before insert or update of product_id, variation_id on public.student_pack_components
for each row execute procedure private.validate_pack_component_variation();

alter table public.universities enable row level security;
alter table public.academic_years enable row level security;
alter table public.student_packs enable row level security;
alter table public.student_pack_components enable row level security;
alter table public.student_pack_favorites enable row level security;

grant select on public.universities, public.academic_years, public.student_packs,
  public.student_pack_components to anon, authenticated;
grant insert, update, delete on public.universities, public.academic_years,
  public.student_packs, public.student_pack_components to authenticated;
grant select, insert, delete on public.student_pack_favorites to authenticated;

create policy universities_public_read on public.universities for select to anon, authenticated
using (is_active or (select private.is_admin()));
create policy universities_admin_write on public.universities for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy academic_years_public_read on public.academic_years for select to anon, authenticated
using (is_active or (select private.is_admin()));
create policy academic_years_admin_write on public.academic_years for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy student_packs_public_read on public.student_packs for select to anon, authenticated
using (
  (publication_status = 'published' and exists (
    select 1 from public.universities u where u.id = university_id and u.is_active
  )) or (select private.is_admin())
);
create policy student_packs_admin_write on public.student_packs for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy student_pack_components_public_read on public.student_pack_components for select to anon, authenticated
using (
  exists (
    select 1 from public.student_packs sp
    join public.universities u on u.id = sp.university_id
    where sp.id = pack_id and sp.publication_status = 'published' and u.is_active
  ) or (select private.is_admin())
);
create policy student_pack_components_admin_write on public.student_pack_components for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy student_pack_favorites_select_own on public.student_pack_favorites
for select to authenticated using (user_id = (select auth.uid()));
create policy student_pack_favorites_insert_own on public.student_pack_favorites
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.student_packs sp where sp.id = pack_id and sp.publication_status = 'published'
  )
);
create policy student_pack_favorites_delete_own on public.student_pack_favorites
for delete to authenticated using (user_id = (select auth.uid()));

create schema if not exists private;
create table private.student_pack_import_runs (
  id uuid primary key default gen_random_uuid(),
  import_source text not null,
  source_digest text not null,
  university_count integer not null,
  pack_count integer not null,
  component_count integer not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);
create table private.student_pack_import_snapshots (
  run_id uuid not null references private.student_pack_import_runs(id) on delete restrict,
  entity_type text not null check (entity_type in ('university','academic_year','pack')),
  entity_id uuid not null,
  existed_before boolean not null,
  row_before jsonb,
  primary key (run_id, entity_type, entity_id)
);
revoke all on private.student_pack_import_runs, private.student_pack_import_snapshots
from public, anon, authenticated;

create or replace function public.import_dentanova_student_packs(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run uuid;
  item jsonb;
  component jsonb;
  v_university uuid;
  v_year uuid;
  v_pack uuid;
  v_product uuid;
  v_existing boolean;
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if jsonb_typeof(payload->'universities') <> 'array'
    or jsonb_typeof(payload->'academic_years') <> 'array'
    or jsonb_typeof(payload->'packs') <> 'array' then
    raise exception using errcode='22023', message='Student pack payload is invalid';
  end if;

  insert into private.student_pack_import_runs(
    import_source, source_digest, university_count, pack_count, component_count
  ) values (
    payload->>'import_source', payload->>'source_digest',
    jsonb_array_length(payload->'universities'), jsonb_array_length(payload->'packs'),
    coalesce((payload->>'component_count')::integer, 0)
  ) returning id into v_run;

  for item in select value from jsonb_array_elements(payload->'academic_years') loop
    select id into v_year from public.academic_years where code=item->>'code';
    v_existing := v_year is not null;
    if not v_existing then v_year := gen_random_uuid(); end if;
    insert into private.student_pack_import_snapshots
    select v_run,'academic_year',v_year,v_existing,case when v_existing then to_jsonb(a) end
    from (select * from public.academic_years where id=v_year) a
    right join (select 1) seed on true;
    insert into public.academic_years(id,code,label_fr,label_ar,display_order,is_active)
    values(v_year,item->>'code',item->>'label_fr',item->>'label_ar',
      (item->>'display_order')::integer,(item->>'is_active')::boolean)
    on conflict(id) do update set label_fr=excluded.label_fr,label_ar=excluded.label_ar,
      display_order=excluded.display_order,is_active=excluded.is_active;
  end loop;

  for item in select value from jsonb_array_elements(payload->'universities') loop
    select id into v_university from public.universities where source_id=item->>'source_id';
    v_existing := v_university is not null;
    if not v_existing then v_university := gen_random_uuid(); end if;
    insert into private.student_pack_import_snapshots
    select v_run,'university',v_university,v_existing,case when v_existing then to_jsonb(u) end
    from (select * from public.universities where id=v_university) u
    right join (select 1) seed on true;
    insert into public.universities(id,source_id,name,acronym,city,slug,description,image_url,display_order,is_active)
    values(v_university,item->>'source_id',item->>'name',item->>'acronym',item->>'city',
      item->>'slug',nullif(item->>'description',''),nullif(item->>'image_url',''),
      (item->>'display_order')::integer,(item->>'is_active')::boolean)
    on conflict(id) do update set name=excluded.name,acronym=excluded.acronym,city=excluded.city,
      slug=excluded.slug,description=excluded.description,image_url=excluded.image_url,
      display_order=excluded.display_order,is_active=excluded.is_active;
  end loop;

  for item in select value from jsonb_array_elements(payload->'packs') loop
    select id into v_university from public.universities where source_id=item->>'university_source_id';
    select id into v_year from public.academic_years where code=item->>'academic_year_code';
    select id into v_product from public.products
      where source_metadata->>'source_product_id'=item->>'source_product_id';
    if v_university is null or v_year is null or v_product is null then
      raise exception using errcode='23503', message='Pack relationship could not be resolved';
    end if;
    select id into v_pack from public.student_packs
      where import_source=payload->>'import_source' and import_key=item->>'import_key';
    v_existing := v_pack is not null;
    if not v_existing then v_pack := gen_random_uuid(); v_inserted:=v_inserted+1;
    else v_updated:=v_updated+1; end if;
    insert into private.student_pack_import_snapshots
    select v_run,'pack',v_pack,v_existing,case when v_existing then to_jsonb(p) end
    from (select * from public.student_packs where id=v_pack) p
    right join (select 1) seed on true;
    insert into public.student_packs(
      id,university_id,academic_year_id,existing_product_id,name,slug,short_description,
      description,image_url,gallery,pack_code,source_id,source_url,import_source,import_key,
      academic_session,manual_price,component_total,promotional_price,publication_status,
      availability_strategy,is_featured,display_order,seo_title,meta_description,source_metadata,published_at
    ) values (
      v_pack,v_university,v_year,v_product,item->>'name',item->>'slug',
      nullif(item->>'short_description',''),nullif(item->>'description',''),
      nullif(item->>'image_url',''),array(select jsonb_array_elements_text(coalesce(item->'gallery','[]'))),
      nullif(item->>'pack_code',''),item->>'source_id',item->>'source_url',
      payload->>'import_source',item->>'import_key',nullif(item->>'academic_session',''),
      nullif(item->>'manual_price','')::numeric,nullif(item->>'component_total','')::numeric,
      nullif(item->>'promotional_price','')::numeric,item->>'publication_status',
      'components',(item->>'is_featured')::boolean,(item->>'display_order')::integer,
      item->>'name',left(nullif(item->>'short_description',''),160),
      coalesce(item->'source_metadata','{}'),now()
    ) on conflict(id) do update set university_id=excluded.university_id,
      academic_year_id=excluded.academic_year_id,existing_product_id=excluded.existing_product_id,
      name=excluded.name,slug=excluded.slug,short_description=excluded.short_description,
      description=excluded.description,image_url=excluded.image_url,gallery=excluded.gallery,
      pack_code=excluded.pack_code,source_url=excluded.source_url,academic_session=excluded.academic_session,
      manual_price=excluded.manual_price,component_total=excluded.component_total,
      promotional_price=excluded.promotional_price,publication_status=excluded.publication_status,
      source_metadata=excluded.source_metadata;

    delete from public.student_pack_components where pack_id=v_pack;
    for component in select value from jsonb_array_elements(coalesce(item->'components','[]')) loop
      select id into v_product from public.products
        where source_metadata->>'source_product_id'=component->>'source_product_id';
      if v_product is null then raise exception using errcode='23503', message='Component product missing'; end if;
      insert into public.student_pack_components(
        pack_id,product_id,variation_id,source_bundle_item_id,quantity,is_required,
        display_order,notes,replacement_policy,price_snapshot,source_metadata
      ) values (
        v_pack,v_product,nullif(component->>'variation_source_id',''),
        component->>'source_bundle_item_id',(component->>'quantity')::integer,
        (component->>'is_required')::boolean,(component->>'display_order')::integer,
        nullif(component->>'notes',''),'none',nullif(component->>'price_snapshot','')::numeric,
        coalesce(component->'source_metadata','{}')
      );
    end loop;
  end loop;
  update private.student_pack_import_runs set completed_at=now() where id=v_run;
  return jsonb_build_object('run_id',v_run,'inserted',v_inserted,'updated',v_updated,
    'universities',jsonb_array_length(payload->'universities'),
    'packs',jsonb_array_length(payload->'packs'),'components',payload->'component_count');
end;
$$;
revoke all on function public.import_dentanova_student_packs(jsonb) from public, anon, authenticated;
grant execute on function public.import_dentanova_student_packs(jsonb) to service_role;

create or replace function public.rollback_dentanova_student_pack_import(target_run_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snap record; restored integer:=0; archived integer:=0;
begin
  if not exists(select 1 from private.student_pack_import_runs where id=target_run_id
    and completed_at is not null and rolled_back_at is null) then
    raise exception using errcode='22023', message='Student pack import cannot be rolled back';
  end if;
  for snap in select * from private.student_pack_import_snapshots
    where run_id=target_run_id order by case entity_type when 'pack' then 1 when 'university' then 2 else 3 end
  loop
    if snap.entity_type='pack' then
      if snap.existed_before then
        update public.student_packs p set
          name=x.name,slug=x.slug,short_description=x.short_description,description=x.description,
          image_url=x.image_url,gallery=x.gallery,manual_price=x.manual_price,
          promotional_price=x.promotional_price,publication_status=x.publication_status,
          source_metadata=x.source_metadata
        from jsonb_populate_record(null::public.student_packs,snap.row_before) x where p.id=snap.entity_id;
        restored:=restored+1;
      else
        update public.student_packs set publication_status='archived' where id=snap.entity_id;
        archived:=archived+1;
      end if;
    elsif not snap.existed_before and snap.entity_type='university' then
      update public.universities set is_active=false where id=snap.entity_id;
    elsif not snap.existed_before and snap.entity_type='academic_year' then
      update public.academic_years set is_active=false where id=snap.entity_id;
    end if;
  end loop;
  update private.student_pack_import_runs set rolled_back_at=now() where id=target_run_id;
  return jsonb_build_object('run_id',target_run_id,'restored',restored,'archived',archived);
end;
$$;
revoke all on function public.rollback_dentanova_student_pack_import(uuid) from public, anon, authenticated;
grant execute on function public.rollback_dentanova_student_pack_import(uuid) to service_role;
