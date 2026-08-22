-- Transactional RPC to replace student pack components atomically.
-- Created locally for admin save atomicity. DO NOT APPLY REMOTELY IN THIS TASK.

create or replace function public.replace_student_pack_components(v_pack uuid, v_components jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp jsonb;
  v_seen text[] := array[]::text[];
  v_key text;
  v_product uuid;
  v_variation text;
  v_quantity integer;
  v_required boolean;
  v_display_order integer;
  v_source_bundle_item_id text;
  v_notes text;
  v_replacement_policy text;
  v_price_snapshot numeric;
  v_source_metadata jsonb;
  v_count integer := 0;
begin
  if auth.uid() is null or not (select private.is_admin()) then
    raise exception 'Admin access required for pack component replacement' using errcode = '42501';
  end if;

  if v_pack is null then
    raise exception 'Target pack is required' using errcode = '23502';
  end if;

  if not exists (select 1 from public.student_packs where id = v_pack) then
    raise exception 'Target pack missing' using errcode = '23503';
  end if;

  if v_components is null then
    v_components := '[]'::jsonb;
  end if;

  if jsonb_typeof(v_components) <> 'array' then
    raise exception 'Components payload must be a JSON array' using errcode = '23514';
  end if;

  for comp in select value from jsonb_array_elements(v_components) loop
    if jsonb_typeof(comp) <> 'object' then
      raise exception 'Each pack component entry must be a JSON object' using errcode = '23514';
    end if;

    if comp->>'product_id' is null or btrim(comp->>'product_id') = '' then
      raise exception 'Component product_id is required' using errcode = '23502';
    end if;

    begin
      v_product := (comp->>'product_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Component product_id must be a valid UUID' using errcode = '23514';
    end;

    if not exists (select 1 from public.products where id = v_product) then
      raise exception 'Component product missing' using errcode = '23503';
    end if;

    v_variation := nullif(btrim(comp->>'variation_id'), '');
    if v_variation is not null and not exists (
      select 1
      from public.products p
      cross join lateral jsonb_array_elements(coalesce(p.variations, '[]'::jsonb)) as v
      where p.id = v_product
        and (v->>'id' = v_variation or v->>'source_id' = v_variation)
    ) then
      raise exception 'Pack variation does not belong to product' using errcode = '23514';
    end if;

    if comp->>'quantity' is null or btrim(comp->>'quantity') = '' then
      raise exception 'Component quantity is required' using errcode = '23502';
    end if;

    begin
      v_quantity := (comp->>'quantity')::integer;
    exception when invalid_text_representation then
      raise exception 'Component quantity must be an integer' using errcode = '23514';
    end;

    if v_quantity <= 0 then
      raise exception 'Component quantity must be positive' using errcode = '23514';
    end if;

    if comp ? 'is_required' then
      begin
        v_required := (comp->>'is_required')::boolean;
      exception when invalid_text_representation then
        raise exception 'Component is_required must be a boolean' using errcode = '23514';
      end;
    else
      v_required := true;
    end if;

    if comp ? 'display_order' and comp->>'display_order' is not null and btrim(comp->>'display_order') <> '' then
      begin
        v_display_order := (comp->>'display_order')::integer;
      exception when invalid_text_representation then
        raise exception 'Component display_order must be an integer' using errcode = '23514';
      end;
      if v_display_order < 0 then
        raise exception 'Component display_order cannot be negative' using errcode = '23514';
      end if;
    else
      v_display_order := 0;
    end if;

    if comp ? 'source_bundle_item_id' and comp->>'source_bundle_item_id' is not null and btrim(comp->>'source_bundle_item_id') <> '' then
      v_source_bundle_item_id := comp->>'source_bundle_item_id';
    else
      v_source_bundle_item_id := null;
    end if;

    if comp ? 'notes' and comp->>'notes' is not null then
      v_notes := nullif(btrim(comp->>'notes'), '');
    else
      v_notes := null;
    end if;

    if comp ? 'replacement_policy' and comp->>'replacement_policy' is not null then
      v_replacement_policy := nullif(btrim(comp->>'replacement_policy'), '');
      if v_replacement_policy is not null and v_replacement_policy not in ('none', 'admin_approved', 'equivalent') then
        raise exception 'Component replacement_policy is invalid' using errcode = '23514';
      end if;
    else
      v_replacement_policy := 'none';
    end if;

    if comp ? 'price_snapshot' and comp->>'price_snapshot' is not null and btrim(comp->>'price_snapshot') <> '' then
      begin
        v_price_snapshot := (comp->>'price_snapshot')::numeric;
      exception when invalid_text_representation then
        raise exception 'Component price_snapshot must be numeric' using errcode = '23514';
      end;
      if v_price_snapshot < 0 then
        raise exception 'Component price_snapshot cannot be negative' using errcode = '23514';
      end if;
    else
      v_price_snapshot := null;
    end if;

    if comp ? 'source_metadata' then
      v_source_metadata := coalesce(comp->'source_metadata', '{}'::jsonb);
      if jsonb_typeof(v_source_metadata) <> 'object' then
        raise exception 'Component source_metadata must be a JSON object' using errcode = '23514';
      end if;
    else
      v_source_metadata := '{}'::jsonb;
    end if;

    v_key := v_product::text || '::' || coalesce(v_variation, '__NULL_VARIATION__');
    if v_key = any (v_seen) then
      raise exception 'Duplicate logical component identity for pack' using errcode = '23505';
    end if;

    v_seen := array_append(v_seen, v_key);
  end loop;

  delete from public.student_pack_components where pack_id = v_pack;

  for comp in select value from jsonb_array_elements(v_components) loop
    insert into public.student_pack_components (
      pack_id,
      product_id,
      variation_id,
      source_bundle_item_id,
      quantity,
      is_required,
      display_order,
      notes,
      replacement_policy,
      price_snapshot,
      source_metadata
    ) values (
      v_pack,
      (comp->>'product_id')::uuid,
      nullif(btrim(comp->>'variation_id'), ''),
      nullif(btrim(comp->>'source_bundle_item_id'), ''),
      (comp->>'quantity')::integer,
      coalesce((comp->>'is_required')::boolean, true),
      coalesce((comp->>'display_order')::integer, 0),
      nullif(btrim(comp->>'notes'), ''),
      coalesce(nullif(btrim(comp->>'replacement_policy'), ''), 'none'),
      nullif(btrim(comp->>'price_snapshot'), '')::numeric,
      coalesce(comp->'source_metadata', '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'ok', 'inserted', v_count);
end;
$$;

revoke all on function public.replace_student_pack_components(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_student_pack_components(uuid, jsonb) to authenticated;

-- Save pack metadata and its complete component set in one transaction. The
-- component function above performs the detailed relationship validation; an
-- exception from either operation rolls the entire RPC call back.
create or replace function public.save_student_pack(v_pack uuid, v_pack_data jsonb, v_components jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_university uuid;
  v_year uuid;
  v_name text;
  v_slug text;
  v_status text;
  v_manual_price numeric;
  v_component_total numeric;
  v_promotional_price numeric;
begin
  if auth.uid() is null or not (select private.is_admin()) then
    raise exception 'Admin access required for pack save' using errcode = '42501';
  end if;

  if v_pack_data is null or pg_catalog.jsonb_typeof(v_pack_data) <> 'object' then
    raise exception 'Pack payload must be a JSON object' using errcode = '23514';
  end if;

  begin
    v_university := (v_pack_data->>'university_id')::uuid;
    v_year := (v_pack_data->>'academic_year_id')::uuid;
  exception when invalid_text_representation then
    raise exception 'University and academic year must be valid UUIDs' using errcode = '23514';
  end;

  if not exists (select 1 from public.universities where id = v_university) then
    raise exception 'University missing' using errcode = '23503';
  end if;
  if not exists (select 1 from public.academic_years where id = v_year) then
    raise exception 'Academic year missing' using errcode = '23503';
  end if;

  v_name := nullif(pg_catalog.btrim(v_pack_data->>'name'), '');
  v_slug := nullif(pg_catalog.btrim(v_pack_data->>'slug'), '');
  v_status := coalesce(nullif(v_pack_data->>'publication_status', ''), 'draft');
  if v_name is null or v_slug is null then
    raise exception 'Pack name and slug are required' using errcode = '23502';
  end if;
  if v_status not in ('draft', 'published', 'archived') then
    raise exception 'Pack publication status is invalid' using errcode = '23514';
  end if;
  if v_status = 'published' and (v_components is null or pg_catalog.jsonb_array_length(v_components) = 0) then
    raise exception 'Published packs require components' using errcode = '23514';
  end if;

  begin
    v_manual_price := nullif(v_pack_data->>'manual_price', '')::numeric;
    v_component_total := nullif(v_pack_data->>'component_total', '')::numeric;
    v_promotional_price := nullif(v_pack_data->>'promotional_price', '')::numeric;
  exception when invalid_text_representation then
    raise exception 'Pack prices must be numeric' using errcode = '23514';
  end;
  if v_manual_price < 0 or v_component_total < 0 or v_promotional_price < 0 then
    raise exception 'Pack prices cannot be negative' using errcode = '23514';
  end if;
  if v_manual_price is not null and v_promotional_price is not null and v_promotional_price >= v_manual_price then
    raise exception 'Promotional price must be lower than normal price' using errcode = '23514';
  end if;

  if v_pack is null then
    insert into public.student_packs (
      university_id, academic_year_id, name, slug, short_description,
      description, image_url, pack_code, academic_session, manual_price,
      component_total, promotional_price, publication_status, is_featured,
      availability_strategy, availability_override
    ) values (
      v_university, v_year, v_name, v_slug,
      nullif(v_pack_data->>'short_description', ''),
      nullif(v_pack_data->>'description', ''),
      nullif(v_pack_data->>'image_url', ''),
      nullif(v_pack_data->>'pack_code', ''),
      nullif(v_pack_data->>'academic_session', ''),
      v_manual_price, v_component_total, v_promotional_price, v_status,
      coalesce((v_pack_data->>'is_featured')::boolean, false),
      'manual', 'in_stock'
    ) returning id into v_id;
  else
    update public.student_packs
    set university_id = v_university,
        academic_year_id = v_year,
        name = v_name,
        slug = v_slug,
        short_description = nullif(v_pack_data->>'short_description', ''),
        description = nullif(v_pack_data->>'description', ''),
        image_url = nullif(v_pack_data->>'image_url', ''),
        pack_code = nullif(v_pack_data->>'pack_code', ''),
        academic_session = nullif(v_pack_data->>'academic_session', ''),
        manual_price = v_manual_price,
        component_total = v_component_total,
        promotional_price = v_promotional_price,
        publication_status = v_status,
        is_featured = coalesce((v_pack_data->>'is_featured')::boolean, false),
        availability_strategy = 'manual',
        availability_override = 'in_stock'
    where id = v_pack
    returning id into v_id;
    if v_id is null then
      raise exception 'Target pack missing' using errcode = '23503';
    end if;
  end if;

  perform public.replace_student_pack_components(v_id, v_components);
  return v_id;
end;
$$;

revoke all on function public.save_student_pack(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_student_pack(uuid, jsonb, jsonb) to authenticated;
