# DENTANOVA — Build Plan

## Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase**: Postgres + Auth + Storage (see `schema.sql`)
- **Tailwind CSS** + shadcn/ui components
- **Zustand** for cart state (client-side, persisted to localStorage)
- **Vercel** for hosting

No custom API server needed. Supabase client SDK talks to Postgres directly
from the browser/server components, gated by Row Level Security (already
written into `schema.sql`).

---

## Route map

```
/                             → Home: hero, featured categories, featured products
/category/[slug]              → Product grid, filtered by category
/product/[slug]                → Product detail page (variations, add to cart)
/cart                         → Cart review page, "Confirmer" → WhatsApp
/search?q=                    → Search results
/account                      → Login / signup (Supabase Auth UI or custom form)
/account/profile              → Edit profile (name, phone, student/pro)

/admin                        → Dashboard home: business health overview
/admin/products                → Table: all products, search/filter, edit/delete
/admin/products/new            → Create product form
/admin/products/[id]/edit      → Edit product form
/admin/categories              → Manage categories (flat list, drag to reorder optional)
/admin/offers                  → Table of discounts, create/edit/deactivate
/admin/offers/new              → Create offer form
/admin/campaigns               → Table of campaigns, create/edit, see attributed submissions
/admin/campaigns/new            → Create campaign form (banner + link + optional offer)
/admin/analytics                → Site health: embeds/links to Vercel Analytics
```

`/admin/*` routes are protected by a layout that checks
`profiles.role === 'admin'` server-side and redirects to `/` otherwise.
To make someone an admin: manually set `role = 'admin'` on their profile row
in Supabase once (or write a one-off SQL command) — no need for an invite
system for a two-person team.

---

## Admin panel — functional spec

**Product list (`/admin/products`)**
- Table columns: thumbnail, name, category, price, stock status, active toggle
- Search by name, filter by category/stock status
- Quick actions: toggle active/inactive (hide without deleting), edit, delete

**Product form (create/edit)**
- Name, slug (auto-generated from name, editable)
- Description (plain textarea is fine — no need for rich text editor)
- Price + optional compare-at-price (for showing a discount)
- Category select (single select, flat list is enough at your catalog size)
- Target audience: student / professional / both
- Stock status: in stock / out of stock / on order
- Image upload: drag-and-drop, uploads directly to Supabase Storage
  `product-images` bucket, stores the returned public URLs in `images[]`
- Variations (optional, only if a product has size/color options): simple
  repeatable rows of `{label, price}` — stored as `jsonb`, no need for a
  separate variations table at this stage

**Categories (`/admin/categories`)**
- Simple list + add/edit/delete. Parent category dropdown for subcategories
  if you want that depth later; flat list works fine to start.

**Offers (`/admin/offers`)**
- Table: name, badge text, discount, scope (all/category/product), active,
  start/end dates
- Create form: pick scope → conditionally show category or product picker,
  discount type (% or fixed), badge text shown on the product card
  (e.g. "-20%"), optional end date (auto-expires — the `is_active` flag
  stays true but you filter by `ends_at > now()` on the storefront query,
  or run a daily cron/edge function to flip `is_active` off)
- The storefront applies the *best applicable offer* to each product at
  render time: product-level offer > category-level offer > store-wide
  offer, so overlapping offers don't stack unexpectedly

**Campaigns (`/admin/campaigns`)**
- A campaign = a banner + a link + an optional linked offer, reachable via
  a shareable URL like `yoursite.ma/?ref=rentree2026`
- Create form: name, slug, banner image, where the banner links to
  (a category or product), optional offer to auto-activate for visitors
  coming through that link, start/end dates
- When a visitor lands with `?ref=slug` in the URL, store the slug in a
  short-lived cookie/localStorage; if they submit a cart during that
  session, stamp `cart_submissions.campaign_slug` with it
- Table view shows each campaign next to a count of attributed cart
  submissions (a simple `count(*) where campaign_slug = ...` query) — this
  is your actual campaign ROI signal, since there's no payment step to
  measure conversion at

**Dashboard (`/admin` home) — business health**
Pulled entirely from your own Supabase data, no external tool needed:
- Cart submissions over time (daily/weekly count + estimated total value)
- Top 10 products by cart-add frequency
- Products currently out of stock (action item, surfaced prominently)
- Active offers and campaigns at a glance
- Submissions by campaign (see above)

This is "business health," distinct from "website health" below — it's
about what people want to buy, not how many people visited.

**Site health (`/admin/analytics`)**
Per your choice, this uses **Vercel Analytics** rather than custom
tracking:
- Enable it with `@vercel/analytics` (one `<Analytics />` component in the
  root layout) — zero extra backend work, works the moment you deploy to
  Vercel
- Gives you: visitor count, page views, top pages, referrers, basic device/
  browser breakdown, all in Vercel's own dashboard
- Caveat to know upfront: the free Hobby tier shows aggregate stats but
  not custom events, and detailed "time spent per page" beyond basic
  session duration requires the Pro plan's Web Analytics Plus — if that
  granularity turns out to matter a lot, this is the one place you might
  outgrow the free tool later. Since it's decoupled from your own data
  model, swapping it out later (e.g. for Plausible) doesn't touch anything
  else in the app.
- `/admin/analytics` in your own dashboard can just be a page that links
  out to (or iframes, if Vercel allows it in your plan) the Vercel
  Analytics tab, so admins don't have to leave your panel to check it

This is intentionally CRUD-first for v1 — no bulk CSV import, no A/B
testing on offers, no email/SMS campaign sending (campaigns here just
means "trackable banner + link"). Add those later once the core loop is
proven.

---

## Cart → WhatsApp flow (the core UX)

Cart state lives entirely in the browser (Zustand + localStorage
persistence), works identically for guests and logged-in users. Nothing is
written to the database until the moment of submission (optional, for your
own tracking).

```ts
// lib/cart-to-whatsapp.ts
type CartItem = {
  name: string;
  variationLabel?: string;
  quantity: number;
  price: number;
};

const WHATSAPP_NUMBER = "212659547879"; // canonical digits, no + or spaces

export function buildWhatsAppMessage(items: CartItem[], customerName?: string) {
  const lines = items.map(
    (i) =>
      `- ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity} — ${(
        i.price * i.quantity
      ).toFixed(2)} MAD`
  );
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const message = [
    "Bonjour DENTANOVA, je souhaite commander :",
    ...lines,
    `Total estimé : ${total.toFixed(2)} MAD`,
    customerName ? `Client : ${customerName}` : "",
    "Ville de livraison : Casablanca",
    "La livraison est actuellement disponible exclusivement à Casablanca.",
  ]
    .filter(Boolean)
    .join("\n");

  return message;
}

export function redirectToWhatsApp(items: CartItem[], customerName?: string) {
  const message = buildWhatsAppMessage(items, customerName);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.location.href = url;
}
```

The `/cart` confirmation first validates the Casablanca-only delivery rule
through `/api/cart-submissions`, records the analytics submission, and only
then starts the WhatsApp handoff. Errors remain visible and the cart is not
cleared before the handoff is ready.

---

## Folder structure

```
app/
  (storefront)/
    page.tsx                  → home
    category/[slug]/page.tsx
    product/[slug]/page.tsx
    cart/page.tsx
    search/page.tsx
  account/
    page.tsx                  → login/signup
    profile/page.tsx
  admin/
    layout.tsx                → role check + redirect
    products/page.tsx
    products/new/page.tsx
    products/[id]/edit/page.tsx
    categories/page.tsx
components/
  storefront/                 → ProductCard, CategoryNav, CartDrawer, etc.
  admin/                      → ProductForm, ProductTable, ImageUploader
  ui/                         → shadcn components
lib/
  supabase/
    client.ts                 → browser client
    server.ts                 → server component client
  cart-store.ts                → Zustand store
  cart-to-whatsapp.ts
```

---

## Build order (suggested)

1. Supabase project: run `schema.sql`, create `product-images` storage bucket
2. Next.js scaffold + Supabase client setup + Tailwind + deploy an empty
   shell to Vercel early so `@vercel/analytics` starts collecting data
   from day one
3. Storefront: home, category page, product page (read-only, seed a few
   products manually via SQL to test)
4. Cart (Zustand) + WhatsApp redirect — this is your core value prop, get it
   working end-to-end early with fake data
5. Auth: signup/login, profile
6. Admin panel: product + category CRUD
7. Offers: schema already supports it — build the admin form, then apply
   the "best applicable offer" logic on the storefront product card/price
8. Campaigns: banner component + `?ref=` capture + admin CRUD +
   attribution count in the campaigns table
9. Admin dashboard home: business health widgets (cart submissions, top
   products, out-of-stock, campaign attribution)
10. Polish: search, featured products, responsive pass

Steps 3–4 give you a demo-able product fastest — worth doing before the
admin panel if you want something to show early. Offers and campaigns
depend on products already existing, so they naturally come after basic
product CRUD is solid.
