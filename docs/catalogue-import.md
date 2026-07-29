# DENTANOVA catalogue import

The two CSV files in `data/` are authoritative. The workbook is validation-only.
The importer is dry-run by default and validates the required 196 parent and 607
variation counts, parent links, source IDs, slugs, SKUs, prices, and sale prices.

## Safe workflow

1. Apply `supabase/migrations/20260729190000_catalogue_import_support.sql`
   through the repository's linked Supabase workflow.
2. Keep the service-role credential in a local shell or secret manager. Never
   put it in a `NEXT_PUBLIC_*` variable or `.env.local`.
3. Run `npm run catalogue:dry-run`.
4. Record remote table counts and verify the `product-images` bucket policies.
5. Run `npm run catalogue:import -- --confirm-production`.
6. Re-run the dry-run and the reconciliation test, then verify remote counts,
   duplicate SKUs/import keys/slugs, orphan links, publication visibility, and
   image resolution.

The import is idempotent. Parent products match first on `(import_source,
import_key)` and then on normalized SKU. The one source product without a SKU
uses its immutable source product ID. Variation IDs use immutable source
variation IDs. All source categories and otherwise unsupported source fields
are retained in `source_metadata`.

Images are validated as JPEG, PNG, or WebP (maximum 5 MB), stored under stable
hash-based `product-images/catalogue/` paths, and never overwrite unrelated
objects. A missing source image uses the existing DENTANOVA brand fallback.

## Rollback

Each atomic import creates a private run and before-image snapshot. Use the
`run_id` printed by the importer:

```sql
select public.rollback_dentanova_catalogue_import('<run-id>'::uuid);
```

Execute that RPC only with the service role. Pre-existing products are restored.
Newly imported rows are archived instead of deleted, preserving favourites,
sales, and audit relationships. Uploaded catalogue objects are deliberately
retained because an older run may reference the same content hash; remove only
confirmed-unreferenced objects in a separate reviewed operation.
