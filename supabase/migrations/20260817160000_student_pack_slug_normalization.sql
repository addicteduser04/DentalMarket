-- Guarantee student_packs.slug is always a clean, URL-safe value — no matter
-- how the row is written (admin form free-text input, the WooCommerce import
-- RPC, or any future code path). A one-off code fix in the import script is
-- not enough: this enforces the invariant at the data layer itself.

create or replace function private.slugify(value text)
returns text language sql immutable as $$
  select coalesce(nullif(regexp_replace(regexp_replace(
    translate(
      lower(trim(value)),
      'àáâãäåèéêëìíîïòóôõöùúûüçñýÿ',
      'aaaaaaeeeeiiiiooooouuuucnyy'
    ),
    '[^a-z0-9]+', '-', 'g'
  ), '(^-+)|(-+$)', '', 'g'), ''), 'pack');
$$;

create or replace function private.normalize_student_pack_slug()
returns trigger language plpgsql as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  base := private.slugify(new.slug);
  candidate := base;
  while exists (
    select 1 from public.student_packs where slug = candidate and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger student_packs_normalize_slug
before insert or update of slug on public.student_packs
for each row execute procedure private.normalize_student_pack_slug();

-- Re-run normalization on every existing row (fires the trigger above),
-- fixing any already-corrupted slugs — such as the UM6SS Casablanca 3rd
-- year pack that shipped with spaces/accents/uppercase in its slug.
update public.student_packs set slug = slug;

-- Defense in depth: reject any slug that could still bypass the trigger
-- (e.g. a bulk load run with triggers disabled).
alter table public.student_packs
  add constraint student_packs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
