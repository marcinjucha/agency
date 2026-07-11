# Project Memory: Halo Efekt

> Curated 2026-07-11. Durable patterns live in skills (`ag-*`, `tanstack-*`, `vps-*`), CLAUDE.md files (root, `apps/cms/`, `apps/cms/features/`, `n8n-workflows/`, `supabase/`, `packages/calendar/`), and the brain knowledge system (`agency` + inherited `general-technical`/`general-business` pools — surfaced via SessionStart hook). ADR-006 + ADR-008 hold architectural decisions. This file holds only what code/skills/CLAUDE.md/brain cannot tell you yet.

## Production State

- **`notification_email` lives per `survey_link`, not per tenant** — each link has its own notification address.
- **`HALOEFEKT_TENANT_ID` is hardcoded in 12+ places — keep hardcoded, do NOT promote to env var.** UUID `19342448-4e4e-49ba-8bf0-694d5376f953` duplicated across migrations, n8n workflows, seed files, production code. Stable non-secret single-tenant identifier → hardcode is correct. Captured to forestall recurring "should this be in env?" debates.

## Deploy / Vercel

- **Vercel PREVIEW deploys read the STAGING Supabase, not prod — you cannot verify prod-specific content/data on a preview** (2026-06-10). A prod-only blog article 404s on a preview; the landing CTA on a preview showed a staging `landing_pages.cta_url`. HOW TO APPLY: to verify prod-specific data, test against staging data directly, or verify on prod AFTER merge — a preview deploy is the staging dataset behind the prod code.

## Deferred TODOs

- **`uploadImageToS3` uploads the raw full-res file 1:1 to S3 — no resize, no webp** (2026-06-10). @unpic is present but NOT actually transforming; it serves the raw PNG with only width/height attrs. Byte-level image optimization (resize + webp on upload) deferred to AAA-T-302. Don't assume @unpic's presence means images are optimized.

## Worktree Gotchas

- **A parallel git worktree can push an uncommitted migration to the SAME staging DB, invisible in your local `migrations/` dir** (2026-07-09, `worktree-venture-scoped-permissions` pushed `20260709120000_venture_scoped_access.sql`). Every later `supabase db push` then errors because staging is ahead of local. Workaround: temporarily COPY the already-applied migration file into the local `migrations/` dir so `db push` sees it as applied and skips it, then remove the copy. Do NOT `migration repair --status reverted` on it — that would falsely un-mark another worktree's genuinely-applied migration.

## Pending brain-extraction verification

- **[verify] `vite build` exit 0 ≠ types valid — verify type-affecting changes with `tsc --noEmit`, not the build** (2026-06-10). esbuild/Vite transpiles without type-checking; a real TS error (missing required prop) PASSED `npm run build:cms` but `tsc --noEmit` caught it. HOW TO APPLY: for any change touching types, the validation gate is `tsc --noEmit`; a green Vite build is NOT proof of type-correctness. **NOTE (2026-07-11):** the /brain-extract-knowledge run wrote `agency-prod-build-gate` (turbo-build gate) but iCloud/TCC blocked byte-level verification that this `tsc` sub-fact landed there. Confirm it is in `agency-prod-build-gate`; if so, delete this entry.
