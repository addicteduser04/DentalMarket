# Student Packs audit — 2026-07-29

## Repository

- The catalogue contains 196 imported products and 607 JSON variations.
- Products retain stable source IDs in `source_metadata.source_product_id`;
  variations retain `source_id`, enabling reference matching without copying.
- Product favourites are normalized, while carts are browser-persisted and
  cart submissions are revalidated by a server route.
- Administrator routes already enforce authentication and the `admin` profile
  role server-side. Database writes use `private.is_admin()` RLS checks.
- The application had no translation framework. French strings were hard-coded;
  profiles only stored a French/Arabic preference. This phase adds a typed
  French/Arabic message foundation for Student Packs; full application-wide
  localization remains separate from pack data safety.

## Current public source

Source: `https://dentalmarket.ma/product-category/student-supplies/` and its
public WooCommerce Store API, inspected on 2026-07-29.

Eleven university branches are present:

| Acronym | City | Source category |
|---|---|---|
| FMDC | Casablanca | 201 |
| FMDR | Rabat | 214 |
| FMPDF | Fès | 227 |
| UEMF | Fès | 279 |
| UIASS | Rabat | 253 |
| UIC | Casablanca | 322 |
| UIR | Rabat | 240 |
| UM6SS CASA | Casablanca | 292 |
| UM6SS RABAT | Rabat | 1025 |
| UPF | Fès | 266 |
| UPM | Marrakech | 305 |

The reusable source taxonomy contains first through fourth academic years.
Current public product search exposes one reliable live bundle:

- Source 15148 — `Pack 2ème Année UM6SS-Rabat 2026`
- Existing DENTANOVA ordinary product: yes (linked, not duplicated)
- Source bundle components: 93 rows / 56 distinct source products
- Default bundle price: 1,813 MAD
- Current minimum promotional bundle price: 1,682 MAD
- Source stock: 7 complete bundles
- Explicit quantities above one: two component rows
- Optional entries: five

Older 2025–2026 pack names remain in cached category/search pages, but are no
longer returned as current pack products by the live product API. They are not
imported because their current identity, contents, price, and availability
cannot all be reconciled reliably.

## Matching

- Primary match: immutable source product ID.
- Exact variation: one allowed source variation that belongs to the matched
  product.
- Secondary match: unique normalized full product name, used only for two
  products whose source IDs changed to SKU identities in DENTANOVA.
- Result: 93/93 products matched, 60 exact variations, four product-level
  ambiguous variation choices, zero unmatched products.
- The four ambiguous choices are retained at product level and listed in
  `student-packs-manual-review.md`; no variation is invented.

## Design

The migration implements:

`universities → academic_years → student_packs → student_pack_components`

Packs link the existing ordinary pack product through `existing_product_id`.
Components use restrictive product foreign keys and optional variation source
IDs checked by a trigger against the assigned product JSON. Separate pack
favourites prevent identifier collisions. Public RLS exposes only active
universities and published packs; all management writes remain admin-only.

The importer is idempotent through `(import_source, import_key)`, records an
auditable import run, snapshots pre-existing rows, and supplies a non-destructive
rollback RPC. It never imports unrelated products.
