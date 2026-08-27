# Product image egress maintenance

Storefront product and student-pack media is delivered directly from Supabase Storage through `next/image` with `unoptimized`. Vercel therefore provides layout and lazy-loading behavior but does not perform runtime transformations.

## Object convention

Existing originals remain unchanged. Each referenced original may have two immutable siblings:

- `<original-path>.dn-card.webp` — 480 px maximum width, WebP quality 78
- `<original-path>.dn-detail.webp` — 1200 px maximum width, WebP quality 82

Both variants preserve aspect ratio/orientation and are never upscaled. Storefront resolution falls back from the requested variant to the original and finally `/branding/dentanova-product-placeholder.svg`.

## Audit and generation

`npm run images:audit` audits checked-in catalogue references without network access. `node --env-file=.env.local scripts/image-audit.mjs --storage` performs a read-only production metadata inventory; it does not download image bodies or modify Storage.

`npm run images:generate` is a production metadata dry run. Local fixtures can be processed with `npm run images:generate -- --input-dir <input> --output-dir <output>`. A production upload requires both `--apply` and `--confirm-production`; it uploads missing variants with `cacheControl: 31536000`, uses `upsert: false`, and never deletes or overwrites originals.

## Rollout order

1. Run the metadata audit and save its report.
2. Validate local fixtures and review generated WebP quality.
3. Run the production generation dry run.
4. Back up/export current product image references.
5. Run the explicitly confirmed upload and review all skipped objects.
6. Verify representative card/detail variant public URLs in both FR and AR storefront flows.
7. Deploy the application changes only after variants exist.
8. Re-run the audit and monitor Supabase Storage egress/cache hit behavior.

Do not broaden product RLS or pack visibility policies. Variant paths are derived only from already-authorized public image URLs and are independent of catalogue visibility.
