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

- **`tsc` in a worktree resolves `@agency/*` to the MAIN checkout, so it shows PHANTOM errors AND hides real defects for UNCOMMITTED package changes** (2026-07-11, `worktree-client-theming` editing `@agency/email`/`@agency/database`). The worktree has no own `node_modules`; a bare `@agency/x` import walks up past the (missing) worktree root to `main/node_modules/@agency/x → main/packages/x` — the MAIN copy, lacking your uncommitted edits. Result: plain `tsc --noEmit` invents errors referencing symbols main lacks, and silently MISSES real type errors in your new package code (a `Required<BlockTypography>` defect passed until forced resolution). vitest/vite resolve correctly (workspace), so tests pass while tsc lies. HOW TO APPLY: to type-check an `@agency/*` change in a worktree, create a TEMP symlink `<worktree>/node_modules/@agency/<pkg>` → `<worktree>/packages/<pkg>` (shadows only that package; others still walk up), run `tsc` from `apps/cms`, then REMOVE it. The true baseline this way was ~31 errors; without both symlinks, phantom counts (55/78) are meaningless. Vercel builds from the branch so it resolves correctly there — the PREVIEW is the real gate.

## Database / RLS Gotchas

- **`so_clients` uses a COLUMN-SCOPED authenticated SELECT allow-list — every new column is invisible to `authenticated` until the allow-list is re-asserted** (recurring: `sender_name`, `theme`, `theme_id`). Since `20260709163651` the table has `REVOKE SELECT … FROM authenticated` + `GRANT SELECT (explicit column list) … TO authenticated` (to hide plaintext secrets `resend_api_key`/`gmail_app_password`). A bare `ALTER TABLE so_clients ADD COLUMN x` leaves `x` unreadable → CMS `.select()` fails `permission denied for column x` (fails-CLOSED, not open). HOW TO APPLY: any `so_clients` column-add migration MUST append the new column to the `GRANT SELECT (...)` list (copy the prior list verbatim, add the column). `tenants` uses the table-level grant → auto-visible, no re-assert. Secrets stay excluded.

## Authz Gotchas

- **`ROUTE_PERMISSION_MAP` only gates UI navigation (sidebar + `beforeLoad`); it does NOT protect `createServerFn` endpoints** (2026-07-11, theme CRUD shipped with the `design.themes` route mapping but no server gate → any authed tenant member could HTTP-invoke create/update/delete regardless of role; caught by security validation). HOW TO APPLY: a gated feature needs its OWN server-side check inside every `createServerFn` handler (`requireAuthContextFull()` + `hasPermission(key, permissions)`, mirror the venture `gated()` helper), independent of the route map. Adding the permission key to `ROUTE_PERMISSION_MAP` is not enough.

## Theming System

- **Client/campaign theming design is ratified in `docs/THEMING_DESIGN.md` + `docs/THEME_MANAGER_DESIGN.md`** (2026-07-11). Two LOCKED, expensive-to-reverse rules: (1) **hex is the single source-of-truth encoding** (email needs literal inline hex — mail clients drop CSS vars; web derives `--color-*` at the boundary; never invert); (2) **theme/`so_themes` is NEVER anon-readable** (`so_clients` co-locates plaintext secrets) → public landing gets theme only via a SERVER-SIDE-resolved endpoint, never a direct anon read. Model: named-theme library `so_themes` (whole `tokens JSONB` per row — a themes-AS-rows table, which is compatible with the "no tokens table" rule that forbade tokens-AS-rows) + nullable `theme_id` FK on tenants/so_clients(/campaigns). The resolver `resolveClientTheme({tenantTheme, clientTheme})` stays PURE and unchanged — only the CALLER swaps `read row.theme` → `read so_themes.tokens via theme_id` (helper `lib/theme/fetch.server.ts`, never-throws, fallback to inline `theme`). `so_campaigns.brand` is a LIVE public contract (landing reads it) — do not mutate its shape.

## Pending brain-extraction verification

- **[verify] `vite build` exit 0 ≠ types valid — verify type-affecting changes with `tsc --noEmit`, not the build** (2026-06-10). esbuild/Vite transpiles without type-checking; a real TS error (missing required prop) PASSED `npm run build:cms` but `tsc --noEmit` caught it. HOW TO APPLY: for any change touching types, the validation gate is `tsc --noEmit`; a green Vite build is NOT proof of type-correctness. **NOTE (2026-07-11):** the /brain-extract-knowledge run wrote `agency-prod-build-gate` (turbo-build gate) but iCloud/TCC blocked byte-level verification that this `tsc` sub-fact landed there. Confirm it is in `agency-prod-build-gate`; if so, delete this entry.
