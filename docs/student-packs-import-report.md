# Student Packs import report — 2026-07-29

## Source reconciliation

- Universities: 11
- Academic years: 4
- Current reliable packs: 1
- Existing ordinary pack products linked: 1
- Source component rows: 93
- Existing products matched: 93
- Exact variations matched: 60
- Product-level ambiguous variation choices: 4
- Unmatched products: 0
- Source digest: `476d3ca694ec99ba09ce4cd379dc5737657fbbf7bc4f894fd255983d8ba9bd43`

## Status

Production import completed successfully:

- Initial run: `30b05ffe-451a-43af-9c59-1d097add0c72`
  (1 inserted, 0 updated)
- Idempotence run: `d83fae3b-5a56-47da-ab8a-8ea1b8801a62`
  (0 inserted, 1 updated)
- Migrations applied:
  - `20260729210000_student_packs.sql`
  - `20260729213000_fix_student_pack_public_rls.sql`

## Production reconciliation

- Universities: 11
- Academic years: 4
- Packs: 1 published
- Components: 93 (88 required, 5 optional)
- Existing catalogue product linked: 1
- Original catalogue: unchanged at 196 products / 607 variations
- Duplicate university slugs, pack slugs, and import keys: 0
- Orphaned components: 0
- Invalid variation ownership: 0
- Referenced image URLs checked: 68; failures: 0

## Security

- Anonymous visibility: 11 active universities, 1 published pack, 93 published
  components
- Anonymous draft visibility: 0
- Anonymous and ordinary authenticated catalogue writes: 0 affected rows
- Customer pack favourite insert/read/delete: passed with own-row isolation
- Temporary draft, favourite, and customer identity: removed
- Forbidden post-probe mutations: 0
- The initial RLS probe identified that anonymous policies must not invoke the
  private admin helper. The corrective migration split public and admin reads;
  the full probe then passed.

## Application and quality gates

- Desktop, tablet, and mobile HTTP smoke tests: passed for homepage, Student
  Packs landing, university page, year filter, pack page, cart, search, and the
  linked ordinary product page
- Anonymous account/admin routes: server redirect markers verified
- Runtime logs: no exceptions, failed queries, hydration errors, or asset 404s
- French and Arabic production-mode route checks: passed with correct `lang`
  and `dir` values
- Automated tests: 55 passed
- ESLint: passed
- TypeScript: passed
- Production build: passed (35 routes)
- Supabase migration dry runs and applications: passed
- Database lint: no new findings; the pre-existing unused `previous_status`
  advisory remains
- `git diff --check` (excluding byte-preserved authoritative CSV input): passed
