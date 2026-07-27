-- DENTALNOVA account center. Additive only: existing migration history and
-- catalogue/profile policies remain intact.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists clinic_name text,
  add column if not exists preferred_language text not null default 'fr'
    check (preferred_language in ('fr', 'ar')),
  add column if not exists email_order_updates boolean not null default true,
  add column if not exists email_offers boolean not null default false,
  add column if not exists email_availability boolean not null default true,
  add column if not exists email_announcements boolean not null default false,
  add column if not exists whatsapp_marketing_consent boolean not null default false,
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

revoke update on table public.profiles from authenticated;
grant update (
  full_name, first_name, last_name, display_name, avatar_url, phone, user_type,
  clinic_name, preferred_language, email_order_updates, email_offers,
  email_availability, email_announcements, whatsapp_marketing_consent
) on table public.profiles to authenticated;

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favorites_user_created_idx
  on public.favorites(user_id, created_at desc);

alter table public.favorites enable row level security;
grant select, insert, delete on table public.favorites to authenticated;

create policy "favorites_select_own"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites_insert_own"
  on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites_delete_own"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  district text not null,
  postal_code text,
  delivery_instructions text,
  city text not null default 'Casablanca' check (city = 'Casablanca'),
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists delivery_addresses_one_default_per_user
  on public.delivery_addresses(user_id) where is_default;
create index if not exists delivery_addresses_user_idx
  on public.delivery_addresses(user_id);

drop trigger if exists delivery_addresses_updated_at on public.delivery_addresses;
create trigger delivery_addresses_updated_at
  before update on public.delivery_addresses
  for each row execute procedure public.set_updated_at();

alter table public.delivery_addresses enable row level security;
grant select, insert, update, delete on table public.delivery_addresses to authenticated;

create policy "delivery_addresses_select_own"
  on public.delivery_addresses for select to authenticated
  using (user_id = (select auth.uid()));
create policy "delivery_addresses_insert_own"
  on public.delivery_addresses for insert to authenticated
  with check (user_id = (select auth.uid()) and city = 'Casablanca');
create policy "delivery_addresses_update_own"
  on public.delivery_addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and city = 'Casablanca');
create policy "delivery_addresses_delete_own"
  on public.delivery_addresses for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.cart_submissions
  add column if not exists status text not null default 'saved_submission'
    check (status in ('saved_submission', 'whatsapp_handoff', 'confirmed_order')),
  add column if not exists delivery_city text not null default 'Casablanca'
    check (delivery_city = 'Casablanca'),
  add column if not exists delivery_address jsonb;

grant select on table public.cart_submissions to authenticated;

create policy "cart_submissions_select_own"
  on public.cart_submissions for select to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
