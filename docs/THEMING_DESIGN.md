# Theming / Design-Token System — Holistic Design

> Design output of a 6-member design council (2026-07-11). Status: **design ratified, implementation scoped to email-templates only.** This doc is the reference; it names the long-term target AND the deferred roadmap so implementation stays forward-compatible.

## Goal

One theme/design-token system that is (a) editable in the CMS, (b) consumable from many CMS surfaces, (c) able to style the per-client frontend websites the agency builds, (d) coherent across CMS ↔ email ↔ frontend. **WHY:** venture creators are `so_clients` under one Halo Efekt tenant; their emails/sites must reflect the creator's brand, not the agency's. "Gramy long term" — structure must extend without rewrite.

## Two irreversible decisions — LOCKED NOW (even though only email is built)

These are structural and expensive to reverse; the council ratifies the current worktree's choices and freezes them:

1. **Hex is the single source-of-truth encoding.** Tokens are stored/validated as literal hex (`^#([0-9a-f]{6}|[0-9a-f]{3})$`, rejecting `hsl()/rgb()/var()/named`). WHY: email clients (Outlook/Gmail) drop CSS vars, so email MUST get literal hex; you can always emit `--color-x:#hex` for web, but you cannot reliably derive hex from a `var()`/HSL for email. Web derives CSS-vars from hex at the boundary — never invert the direction.
2. **Anon-readable theme NEVER co-habits a table with secrets.** `so_clients` co-locates plaintext `resend_api_key`/`gmail_app_password`. The public web path must read a **secret-free projection only** — today `so_campaigns.brand` / the resolved `theme` returned by the public campaign endpoint; never a table-level `GRANT ON so_clients TO anon`, not even column-scoped. WHY: one careless broad GRANT = a secret-leak security incident, not a refactor.

## Token model — two layers

- **Brand primitives (client-editable, stored, hex):** the current 9 tokens (`primary, primaryText, accent, background, text, mutedText, headerBackground, headerText, footerText`) + `logoUrl?`, `fontFamily?`. This is the INPUT layer. Small on purpose — a client sets a brand intent, not a design system.
- **Derived semantic scale (never stored per-client):** full websites need ~29 roles (`card, popover, muted, border, input, ring, chart-*, status-*`) + `radius` + type scale. These are **derived per-surface** from the few brand inputs by each surface's emitter, layered over a neutral complete base — never persisted per client (persisting them recreates the 4× globals.css divergence inside JSONB).

Non-color tokens (`radius`, spacing, type scale) are a **separate token kind** (semantic keys, not `HexColor`) — added additively, web-scope, later. Never pollute the branded-hex invariant that keeps email safe.

## Storage & override hierarchy

- **Storage stays JSONB on rows** (`tenants.theme`, `so_clients.theme`) — no tokens table (always read whole, never queried per-token; a table turns every additive token into a migration + 4-app rebuild). Growth is **additive**: new key = 1 entry in the as-const key list + default + schema line; old rows without the key fall through the resolver's backfill. No `version` field until a genuine format break.
- **Override hierarchy = tenant (agency default) → so_client (creator brand) → so_campaign.brand (per-launch skin)**, resolved by ONE resolver (whole-object selection + neutral-default backfill + WCAG contrast guard). "Per-site" is NOT a storage level — a client website is the *rendering* of its so_client/campaign theme.
- **`so_campaigns.brand`** (5-key subset, snake_case, anon-GRANTed, consumed by the live public landing) is **adapted-on-read** into the token vocabulary via `brandToThemeTokens()` (the `BRAND_TO_THEME` map already documents it). Keep the physical column for backward-compat; never mutate its shape (it's a live public contract) — add new surfaces instead.
- **`email_templates.blocks`** stays separate (it's authored content, not brand) and *consumes* the resolved theme. **4× `globals.css`** stay orthogonal (per-app static chrome, different lifecycle) — consolidation is its own deferred worktree and is NOT a prerequisite for client theming.

## Consumption architecture — one resolver, two emitters

The theme domain (`ThemeTokens`/`ResolvedTheme`, `themeTokensSchema`, `parseThemeTokens`, `resolveClientTheme`, `HALO_EFEKT_DEFAULT`, `contrastRatio`) is pure/sync/never-throws and already barreled. It exposes:
- `resolveClientTheme(...)` → `ResolvedTheme` (9 required literal-hex tokens).
- `toInlineHex(resolved)` — **email emitter** (literal hex into inline styles; formalizes what bonus-email does today).
- `toCssVars(resolved)` / `toCssBlock(resolved)` — **web emitter** (`:root{--color-primary:#..;…}` for SSR injection). *Deferred — built when web lands.*

**Read boundary differs per consumer; the resolver is the same:**
- **CMS** — server fn (cookie/RLS client) reads `*.theme`, resolves for editing + live preview.
- **Email** — service-role read, resolve → `toInlineHex`. (Bypasses RLS; no anon exposure.)
- **Public web** — runtime fetch via the **existing** `GET /api/venture/campaigns/$client/$slug` endpoint, which resolves server-side and returns `theme: ResolvedTheme` in the `PublicCampaign` payload. No new endpoint, no new GRANT, no new CORS surface. Client sites (off-monorepo or shop-style) SSR-inject `toCssBlock` output as a `:root` `<style>` layered over their static `globals.css` — **no rebuild on color change** (Tailwind v4 plain `@theme` here is runtime-var-overridable, proven by existing `var(--color-*)` usage in shop/jacek).

**Package timing (the one council fork — resolved):** DEFER the `@agency/theme` package. NOW lift the theme module `apps/cms/features/venture/theme/` → **`apps/cms/lib/theme/`** (CMS-neutral home both `features/email` and `features/venture` import; avoids a features→features smell). WHY defer the package: only CMS consumes today (project rule = shared package at 2+ *apps*); a package adds build-config/lockfile cost with no second consumer; and the resolver is PURE so promoting `lib/theme/` → `packages/theme/` later is a cheap file move. The package is the documented destination the moment `apps/website`/`apps/shop/*` consume (they can't import from an app per ADR-006 `packages→apps` — that's what forces the package then, not now).

## Implementation scope — NOW = email-templates only (additive, byte-identical)

The `email_templates` feature (`apps/cms/features/email/`) pre-renders `html_body` at CMS-save; n8n reads `html_body`. So the resolution boundary is **CMS-save/preview time, n8n needs ZERO changes.**

- **Iter A — theme module lift:** `features/venture/theme/` → `apps/cms/lib/theme/`; repoint venture imports (mechanical, zero behavior change).
- **Iter B — renderer token support (`@agency/email`, additive):** optional `theme?` param on `renderEmailBlocks`; optional `*ColorToken?` fields on block interfaces. Resolution ladder: **explicit token ref → explicit raw hex → themed default (from resolved theme) → hardcoded fallback.** Collapse the duplicated `DEFAULT_BLOCK_TYPOGRAPHY` so unstyled blocks derive their default from the resolved theme (so an unstyled block re-brands when a tenant sets a theme — the point of theming), while blocks with explicit author hex keep it. Package stays dependency-free (takes a plain color map, never imports the resolver). Byte-identical when no theme / no token.
- **Iter C — CMS wiring:** resolve `tenants.theme` (`clientTheme:null`) in `saveTemplate`/`insertTemplate`/preview/reset; pass the resolved map into the renderer so preview and stored `html_body` bake the same colors. Block editor offers a token-or-custom-hex control (dropdown of token keys with swatches). Editor **inherits** the tenant theme — no per-template theme picker.
- **Validate per iteration** (functional + architecture + security). Manual testing: user.

**Guards:** empty theme → resolves to `HALO_EFEKT_DEFAULT` → byte-identical to today; no `var(`/`hsl(`/token-name ever leaks into HTML (resolver fails open to hex); existing raw-hex blocks unchanged.

## Deferred roadmap (ordered, all additive / isolatable — none forces a rewrite)

1. Web emitters (`toCssVars`/`toCssBlock`) + `theme: ResolvedTheme` added to `PublicCampaign` payload.
2. Shop-style client site: loader fetches resolved theme → SSR-inject `:root` vars over a neutral base `@theme`; retire per-client baked palettes (keep structural CSS).
3. Promote `apps/cms/lib/theme/` → `packages/theme/` (when website/shop consume — 2+ apps).
4. `brandToThemeTokens` adapter folds `so_campaigns.brand` into the resolver as the campaign tier; `brand` deprecated-as-peer (kept for byte-compat).
5. Web token expansion (radii/spacing/type scale/states) — additive new keys/kinds.
6. `globals.css` consolidation → generated from tokens (its own worktree), as a *consumer* of the token source, not a parallel source.

## Breaking moves to avoid entirely

Mutating `so_campaigns.brand` shape (live public contract) · any anon GRANT on `so_clients` · theme as a live override of already-authored `email_templates` blocks/`html_body` (only defaults/unstyled follow the theme; explicit author colors persist) · switching the source-of-truth encoding off hex.
