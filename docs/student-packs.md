# DENTANOVA Student Packs

## Safe update workflow

1. Run `npm run student-packs:dry-run`.
2. Review source counts and `docs/student-packs-manual-review.md`.
3. Apply the timestamped migration through the linked Supabase workflow.
4. Record production baseline counts.
5. Run `npm run student-packs:import -- --confirm-production` with the service
   role available only in the server process environment.
6. Re-run the dry-run and reconcile universities, years, packs, components,
   exact variation ownership, duplicates, RLS, images, and application routes.

The importer reads only the public WooCommerce Store API and matches against the
authoritative catalogue CSVs. It is idempotent and never creates products or
variations.

## New academic year

- Add a reusable `academic_years` row only when the source introduces a new
  year beyond the current first–fourth records.
- Keep `code` stable and update localized labels rather than creating aliases.
- Update the source bundle/session, run the dry-run, and review every ambiguous
  match.
- Never infer a quantity or variation. Resolve it in the source or enter it
  explicitly through the admin editor.
- Publish only after product links, pricing, and required component availability
  validate.

## Rollback

Use the run ID returned by the importer:

```sql
select public.rollback_dentanova_student_pack_import('<run-id>'::uuid);
```

Run this only with the service role. New packs are archived, not deleted;
pre-existing pack fields are restored, and operational catalogue/customer data
is preserved.
