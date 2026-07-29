# Catalogue import report — 2026-07-29

## Source reconciliation

- Authoritative parent rows: 196 (validated)
- Authoritative variation rows: 607 (validated)
- Variable parents: 100
- Parent SKUs: 195 unique, 1 blank
- Parent slugs: 196 unique
- Variation source IDs: 607 unique
- Variation SKUs: 358 unique, 249 blank
- Missing variation parents: 0
- Normalized primary categories: 37
- Non-empty brands: 16
- Products without a source image: 1 (mapped to the DENTANOVA fallback)
- Source currency: MAD only
- Source digest: `95d299e9884c65ec5613ee91e38a822cbff64e6dbf5ad61f9c9c3018515ae4cd`

## Remote baseline

The linked production project was inspected before import. Aggregate statistics
reported 1 product, 1 category, 1 profile, 2 cart submissions, and no sales,
sale items, favourites, or delivery addresses. Existing operational rows were
not modified. The existing product/category are the archived demo records from
the prior migration.

## Migration

`20260729190000_catalogue_import_support.sql` was dry-run, applied to the linked
project, and confirmed in remote migration history. It is additive and creates
stable import identity, private audit/snapshot tables, an atomic service-role
import RPC, and a non-destructive rollback RPC. It does not weaken existing RLS
or grants.

## Import status

The production data import completed successfully and atomically:

- Run ID: `43c76d70-dbc8-4a18-b29c-1b72b0ed4f3d`
- Inserted: 196
- Updated: 0
- Skipped: 0
- Rejected: 0
- Final imported products: 196
- Final imported variations: 607
- Final imported categories: 37 (38 total including the archived demo category)
- Final total products: 197 (196 public imports plus the archived demo product)

## Verification completed

- Import dry-run: passed (196/607)
- Reconciliation tests: passed
- Full automated tests: 42 passed
- ESLint: passed
- TypeScript (`tsc --noEmit`): passed
- Production build: passed
- `git diff --check`: passed
- Supabase migration dry-run/application/history check: passed
- Supabase database lint: no new findings; one pre-existing warning for the
  unused `previous_status` variable in `public.save_manual_sale`
- Remote import reconciliation: passed (196 products, 607 variations, no
  duplicate slugs/import keys/non-blank SKUs, missing categories, missing
  source IDs, or incorrect publication flags)
- Image resolution: passed for all 240 unique hosted image URLs; the one product
  without a source image uses the local DENTANOVA fallback
- Anonymous RLS probe: passed (196 public imports visible, archived product and
  profiles hidden, catalogue update affected zero rows)
- Authenticated non-admin RLS probe: passed (own profile only, public catalogue
  visible, catalogue update affected zero rows); the temporary probe identity
  was deleted and a service-level post-check found no forbidden mutation
- Application smoke tests: passed on `/`, `/search`, and an imported
  `/product/[slug]` route with desktop and mobile user-agent profiles (HTTP 200,
  catalogue content rendered, no application error)
