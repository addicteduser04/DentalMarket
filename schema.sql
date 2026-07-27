-- ============================================================
-- DENTALNOVA — deprecated Supabase schema snapshot
-- DEPRECATED REFERENCE ONLY. DO NOT RUN THIS FILE.
-- Use the versioned files in supabase/migrations instead. This snapshot predates
-- the non-recursive administrator-policy correction.
-- ============================================================

-- ---------- PROFILES ----------
-- Extends Supabase auth.users with app-specific fields + role
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  user_type text check (user_type in ('student', 'professional')) default 'student',
  role text check (role in ('customer', 'admin')) default 'customer',
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- CATEGORIES ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references categories(id) on delete set null,
  display_order int default 0,
  created_at timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2), -- original price, for showing a discount strike-through
  category_id uuid references categories(id) on delete set null,
  images text[] default '{}',      -- array of Supabase Storage public URLs
  stock_status text check (stock_status in ('in_stock', 'out_of_stock', 'on_order')) default 'in_stock',
  target_audience text check (target_audience in ('student', 'professional', 'both')) default 'both',
  variations jsonb default '[]',   -- e.g. [{"label":"Taille 0.5mm","price":10},{"label":"Taille 1mm","price":12}]
  is_active boolean default true,  -- soft delete / hide without deleting
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);
create index idx_products_slug on products(slug);

-- keep updated_at fresh
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute procedure public.set_updated_at();

-- ---------- OFFERS ----------
-- Discounts applied to a product, a whole category, or the whole store
create table offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- internal label, e.g. "Rentrée 2026"
  badge_text text,                    -- shown on product card, e.g. "-20%"
  discount_type text check (discount_type in ('percentage', 'fixed')) not null,
  discount_value numeric(10,2) not null,
  scope text check (scope in ('all', 'category', 'product')) not null,
  category_id uuid references categories(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  starts_at timestamptz default now(),
  ends_at timestamptz,                -- null = no end date
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_offers_active on offers(is_active);
create index idx_offers_category on offers(category_id);
create index idx_offers_product on offers(product_id);

-- ---------- CAMPAIGNS ----------
-- A trackable promo (banner + link), e.g. a social media push or a seasonal push
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,          -- used in ?ref=slug links you share externally
  banner_image_url text,
  banner_link text,                   -- where the banner sends people, e.g. /category/orthodontie
  offer_id uuid references offers(id) on delete set null, -- optional linked discount
  starts_at timestamptz default now(),
  ends_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_campaigns_slug on campaigns(slug);
create index idx_campaigns_active on campaigns(is_active);

-- ---------- CART SUBMISSION LOG (optional, analytics only) ----------
-- Not a real order table — just a record of what was sent to WhatsApp,
-- useful for tracking conversion / popular products / campaign attribution.
-- Safe to skip if you don't care about this data.
create table cart_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null, -- null if guest
  items jsonb not null,        -- snapshot: [{product_id, name, qty, price}]
  estimated_total numeric(10,2),
  campaign_slug text,           -- captured from ?ref= param at session start, if present
  created_at timestamptz default now()
);

create index idx_cart_submissions_campaign on cart_submissions(campaign_slug);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table cart_submissions enable row level security;

-- PROFILES: users can read/update their own profile; admins can read all
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "profiles_admin_read_all" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- CATEGORIES: public read, admin write
create policy "categories_public_read" on categories
  for select using (true);

create policy "categories_admin_write" on categories
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- PRODUCTS: public read (active only), admin full access
create policy "products_public_read" on products
  for select using (is_active = true);

create policy "products_admin_read_all" on products
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "products_admin_write" on products
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "products_admin_update" on products
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "products_admin_delete" on products
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- CART SUBMISSIONS: anyone can insert (guest or logged in), only admin can read
create policy "cart_submissions_insert" on cart_submissions
  for insert with check (true);

create policy "cart_submissions_admin_read" on cart_submissions
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- OFFERS: public read (active only), admin full access
alter table offers enable row level security;

create policy "offers_public_read" on offers
  for select using (is_active = true);

create policy "offers_admin_all" on offers
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- CAMPAIGNS: public read (active only, needed to render the banner), admin full access
alter table campaigns enable row level security;

create policy "campaigns_public_read" on campaigns
  for select using (is_active = true);

create policy "campaigns_admin_all" on campaigns
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- STORAGE (run separately in Storage > Policies, or via dashboard UI)
-- Create a public bucket named "product-images"
-- Policy: public read, admin-only write (mirror the products policy above)
-- ============================================================
