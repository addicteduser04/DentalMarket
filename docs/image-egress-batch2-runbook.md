# DENTANOVA egress Batch 2 runbook

This pass is designed to reduce Supabase egress without changing product visibility, deleting originals, or paying for runtime image transformation.

## Preconditions

- Current production app is deployed from the verified variant resolver.
- `.env.local` is ignored by Git and contains the production Supabase URL plus a server-side key only on the operator machine.
- Do not upload `.env.local` or secrets to third parties.

## 1. Produce the metadata-only heavy plan

```bash
npm run images:plan-heavy -- --output-dir .image-egress/batch2
```

Default threshold: 150,000 bytes. Default batch size: 40. Maximum batch size: 50.

Review:

```bash
cat .image-egress/batch2/heavy-plan-report.json
```

The report ranks only storefront-referenced originals missing required registered variants. Small originals are intentionally left alone unless they are selected for another reason.

## 2. Inspect batch 1 locally

```bash
node --env-file=.env.local scripts/generate-image-variants.mjs \
  --manifest .image-egress/batch2/heavy-batch-01.json \
  --inspect \
  --output-dir .image-egress/batch2/inspect-01
```

Review the generated WebPs and `variant-report.json`. The generator rejects variants that save less than 10% and never upscales.

## 3. Upload the reviewed batch

```bash
node --env-file=.env.local scripts/generate-image-variants.mjs \
  --manifest .image-egress/batch2/heavy-batch-01.json \
  --apply \
  --confirm-production \
  --output-dir .image-egress/batch2/apply-01
```

Uploads use `upsert:false` and one-year cache control. Originals are untouched.

## 4. Verify and register only proven variants

```bash
node --env-file=.env.local scripts/verify-image-variants.mjs \
  --candidate-registry .image-egress/batch2/apply-01/variant-registry.json \
  --update-registry
```

Verification requires each candidate object to exist, be non-empty WebP, and carry at least one-year cache control before it is merged into `data/product-image-variants.json`.

## 5. Validate before deployment

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Then inspect the diff. Only expected code/docs/registry changes should be committed. `.image-egress/` is ignored.

## 6. Production smoke test

After deployment:

- Open homepage, search, category, favorites, product detail, and student-pack pages.
- DevTools -> Network -> Img -> Disable cache -> hard reload.
- Heavy card requests should resolve to `.dn-card.webp` when registered.
- Heavy product/pack hero requests should resolve to `.dn-detail.webp` when registered.
- Small originals can remain direct fallbacks.
- Lazy loading should remain active on cards.

Monitor Supabase egress for one complete post-deployment day before deciding whether another batch is justified.
