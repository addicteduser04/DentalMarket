# DENTANOVA

An online catalogue for dental supplies in Morocco, serving students and professionals. Customers browse products and student packs, fill a cart, and confirm the order over **WhatsApp**. There is no online payment. Admins manage the catalogue, offers, campaigns, and manual sales from a built-in dashboard.

## Stack

- **Next.js 16** (App Router, TypeScript, React 19)
- **Supabase**: Postgres, Auth, Storage, and Row Level Security
- **Tailwind CSS** with shadcn/ui-style components
- **Zustand** for the client-side cart
- **Vitest** for tests
- **Vercel** for hosting, Analytics, and Speed Insights

## Features

- **Storefront:** home page, categories, product pages with variations, search, and favorites
- **Student packs:** packs grouped by university and academic year, plus recommended products
- **Cart → WhatsApp:** the cart is turned into a prefilled WhatsApp message (with rate limiting on submissions)
- **Account center:** profile, delivery address, notifications, security, and order history
- **Admin (`/admin`):** products, categories, offers, campaigns (`?ref=` attribution), manual WhatsApp sales with printable receipts, student packs, universities, and analytics
- **Image pipeline:** optimized WebP card/detail variants generated from the original uploads to reduce Supabase egress

## Getting started

Requirements: Node.js 20–24 and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Then open http://localhost:3000.

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Public (publishable) key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Legacy fallback for the public key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `.env.local` | Optional override for the business WhatsApp number |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | shell only | Needed only by the maintenance scripts in `scripts/` |

> ⚠️ Never commit `.env*` files. Never put the service-role or secret key in a `NEXT_PUBLIC_*` variable; anything with that prefix is sent to the browser.

### Database

The schema lives in `supabase/migrations/`. Apply the migrations in order to your project, for example with `supabase db push` on a linked project. `schema.sql` is the original reference schema.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Build and serve for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc` |
| `npm test` | Run the Vitest suite |
| `npm run catalogue:dry-run` / `catalogue:import` | Validate and import the product catalogue from `data/` |
| `npm run student-packs:dry-run` / `student-packs:import` | Import student packs |
| `npm run student-recommendations:dry-run` / `student-recommendations:import` | Import recommended products |
| `npm run images:audit` / `images:plan-heavy` / `images:generate` / `images:verify` | Audit, plan, generate, and verify image variants |

The import and image scripts are **dry-run by default**. Writing to production requires `--apply` and/or `--confirm-production`. See `docs/` for the full runbooks.

## Project structure

```
app/          Next.js routes (storefront, account, admin)
components/   UI components (storefront, account, admin, ui)
lib/          Data access, business logic, i18n, Supabase clients, and their tests
scripts/      Catalogue, pack, and image maintenance scripts
supabase/     SQL migrations
data/         Catalogue source files (CSV/XLSX) and image variant registry
docs/         Runbooks and import/audit reports
public/       Static branding, visuals, and video
tests/        Integration-style tests
```

## Deployment

The app is deployed on Vercel. Set the `NEXT_PUBLIC_*` variables in the Vercel project settings. Service-role keys are not needed at runtime.
