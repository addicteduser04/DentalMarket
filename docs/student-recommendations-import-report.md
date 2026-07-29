# Student recommendations import report — 2026-07-29

## Root-cause verification

The production fixed pack was never empty in the database. Anonymous PostgREST
queries return all 93 `student_pack_components`, including their product and
category joins, and the deployed pack HTML contains component names. The
reported empty state was therefore consistent with the application version
before commit `f9899a8` reached production or a stale deployment/cache. The
application query now fails safely instead of silently treating a query error as
an empty component list.

## Source audit

- Source hierarchy:
  `https://dentalmarket.ma/product-category/student-supplies/`
- University/year pages inspected: 40
- Universities with year pages: 10
- Academic years per university: 4
- Ordinary-product relationships: 640
- Unique existing DENTANOVA products: 61
- Unmatched products: 0
- Exact variations selected: 0
- Source digest:
  `9b22c12dac1287f38b74683db8c1285a2778a6d9a9b1bf693faa59e5dd0e222e`

The source category pages identify products but do not reliably select a
variation or quantity. Relationships are therefore presented as recommended
individual supplies, never as fixed-pack contents.

UM6SS Rabat has no equivalent four-year category hierarchy in the source. Its
existing verified fixed pack remains the only published association, with 93
components and 60 exact variation matches.

## Production import

- Migration: `20260729220000_student_recommended_products.sql`
- Initial run: `854465d2-affc-41f7-923e-36108745904b`
  - 640 inserted
  - 0 updated
- Idempotence run: `1ef9a0ee-62e7-4704-b7e8-6f53705070f9`
  - 0 inserted
  - 640 updated

## Reconciliation

- Catalogue preserved: 196 products / 607 variations
- Universities: 11
- Academic years: 4
- Fixed packs: 1 published
- Fixed-pack components: 93
- Recommended relationships: 640
- Unique recommended products: 61
- Duplicate relationships/import keys: 0
- Orphaned recommendations/components: 0
- Invalid variation ownership: 0
- Anonymous recommendation visibility: 640
- Anonymous and ordinary authenticated writes: blocked
- Draft/archived pack visibility: 0

## Rollback

`rollback_student_recommendation_import(run_id)` deletes only relationships
owned by this recommendation import source. It does not delete or alter
products, variations, packs, components, profiles, favourites, carts, requests,
sales, or inventory.
