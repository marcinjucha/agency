# Theme Manager — UX & Data-Model Design

> Extends `docs/THEMING_DESIGN.md`. Design output of ag-design-agent (2026-07-11). Adds a dedicated **named-theme library** + assignment at tenant/client/campaign. Design ratified pending user go on scope + data model.

## The shift
From "theme = inline JSONB blob per row" → **themes are reusable NAMED entities you create once, then reference/assign** at organization / client / campaign. Key clarification: `THEMING_DESIGN.md` "no tokens table" forbids *tokens-as-rows* (one row per token → migration per token). A **`so_themes` table where each row stores a whole `tokens JSONB` blob** is compatible with the locked rules (hex source-of-truth, whole-object JSONB). The pure resolver signature `{tenantTheme, clientTheme}` is UNCHANGED — only the caller swaps `read row.theme` → `read themes.tokens via row.theme_id`.

## Information architecture
- New **"Motywy"** top-level sidebar entry (System group, above Szablony e-mail; `Palette` icon). Gate with new `design.themes` permission.
- Routes: `/admin/themes` (library) · `/admin/themes/new` · `/admin/themes/$id` (editor). No separate assign route — assignment lives in existing entity editors.

## Screens
**Library (`/admin/themes`)** — gallery cards; hero = 9-token swatch strip (not a photo); name; "Używany przez: N klientów · M kampanii" (reverse FK); `Domyślny` badge. Actions: + Nowy motyw (orange primary), ⋯ = Edytuj/Duplikuj/Ustaw domyślny/Usuń. **Delete guarded** if used (list dependents, block orphan). EmptyState applies (dynamic list).

**Editor (`/admin/themes/$id`)** — 2-col (left tokens / right live preview). Left: Nazwa + `Domyślny` checkbox; 9 ColorPickers grouped (Marka / Tło+tekst / Nagłówek+stopka, mirror CampaignBrandEditor); LogoMediaField + fontFamily input. Right (sticky): swatch grid + **mock email** (header/body/CTA/footer via `resolveClientTheme`) + **WCAG contrast badge** on header pair (uses `contrastRatio`/`ensureHeaderContrast`) + disabled "Podgląd strony — Wkrótce" tab (slot for future web emitter). Explicit Save + ⌘S (high-impact).

## Assignment UX (the key ask) — pickers INSIDE existing editors, not a central matrix
Rationale: decision "which brand does THIS client wear" is made while editing that client. Theme Manager shows read-only reverse ("used by N"). Control = combobox-with-inline-create ("+ Nowy motyw" without leaving), in a "Motyw" CollapsibleCard.

Precedence made visible (tenant → client → campaign, most-specific wins):
- **Tenant** (Settings/TenantForm): dropdown of library themes = org base (falls to HALO_EFEKT_DEFAULT if unset).
- **Client** (VentureClientEditor): radio `( ) Dziedziczy z organizacji [swatch]` / `(•) Własny motyw [combobox]` — writes null vs theme_id. + "Efektywny motyw: …" resolved chip.
- **Campaign**: same shape; MVP = read-only "Dziedziczy z klienta" (resolver has no campaign tier yet).

## Data model — RECOMMENDATION: Option A (themes table + FK reference), Option C deferred additive
- **A (recommended):** `so_themes (id, tenant_id, name, tokens JSONB, is_default, timestamps)` + nullable `theme_id` FK on `tenants`, `so_clients`, (later) `so_campaigns`. Live reference (edit-once-propagates), reverse "used by" cheap, resolver-pure-signature untouched, additive migration, hex/JSONB locked rules intact, authenticated-only (never anon — `so_themes` stays off the public path; landing keeps `so_campaigns.brand`). `ON DELETE SET NULL` + UI delete-guard.
- **B (rejected):** copy-on-assign — breaks "live reference" mental model (edits don't propagate).
- **C (deferred, additive later):** hybrid `theme_id` + optional per-row `theme_override JSONB` for one-off tweaks. Reachable without rewrite.

## Reconciliation (no breakage)
Seed migration: read each distinct inline `so_clients.theme`/`tenants.theme` → insert named `so_themes` row (e.g. "Kacper — Navy", "Halo Efekt") → set owning row's `theme_id`. Keep inline columns (defensive), read-nulled after backfill (become Option-C override slot or dropped later). Email-templates consumption unaffected (resolution still at save/preview; only fetch source changes; empty→HALO_EFEKT_DEFAULT byte-identical). Public landing untouched (`so_campaigns.brand` shape = live contract, not mutated). Locked "no anon read of so_clients" preserved (so_themes never anon-granted).

## MVP vs vision
**MVP (matches 2-tier resolver):** so_themes + theme_id on tenants+so_clients (+ seed reconcile) · /admin/themes library + editor (email preview + contrast badge) · tenant + client pickers with inherit/own + resolved chip · sidebar entry · campaign "Motyw" card READ-ONLY placeholder.
**Vision (additive, isolated later):** campaign tier (resolver 3-tier + brandToThemeTokens fold + so_campaigns.theme_id) · web preview tab + toCssBlock emitters + client-site SSR inject · Option-C inline overrides · central assignment matrix (bulk reassign) · non-color tokens (radius/spacing).

## Open questions for the data/RBAC pass
FK on-delete (recommend SET NULL + UI guard) · `design.themes` permission key · add `so_campaigns.theme_id` now (additive) even though tier deferred (recommend yes).

---

# Campaign tier — ratified by 5-member council (2026-07-11)

Strong consensus, zero contradictions across data-model / resolver / security / landing / UX lenses. Decision: **GO**.

## Fate of `so_campaigns.brand`: KEEP as the campaign-tier INLINE FALLBACK (never deprecate, never a rival source)
`brand` is a LIVE anon public contract (landing reads it) — do not mutate its shape. Reframe it exactly like `tenants.theme`/`so_clients.theme` at their tiers: **`theme_id` primary → `brandToThemeTokens(brand)` inline fallback → inherit client → tenant → HALO_EFEKT_DEFAULT.** Source of truth = the `so_themes` FK chain; each tier's inline JSONB is authoritative ONLY when that tier's `theme_id IS NULL`. One `fetchThemeTokens` per tier, one resolver across tiers, NO caching/denormalization.

## Resolver 3-tier (byte-identical guaranteed)
Add OPTIONAL `campaignTheme?: ThemeTokens | null` to the named-object signature `resolveClientTheme({tenantTheme, clientTheme, campaignTheme?})`. Whole-object selection: campaign-if-any-override → client → tenant → `{}`; backfill + WCAG guard unchanged. `?? null` means a 2-tier caller hits the identical existing branch (pin with a `===` regression test). `brandToThemeTokens(raw: Json): ThemeTokens` lives in `lib/theme` (implement the reserved stub): remap `BRAND_TO_THEME` (bg→background, logo_url→logoUrl, font→fontFamily, primary/accent 1:1), hex-validate each colour via `hexColorSchema`, never-throws → `{}`. Structural `Json` param (no lib→features import). Campaign tier = `fetchThemeTokens(sb, campaign.theme_id, brandToThemeTokens(campaign.brand))` (unchanged fetch helper). Brand-only campaign (no theme_id) still colours the email via the adapter — zero migration; its missing header/footer tokens backfill from Halo default (accepted whole-object contract).

## Public/anon path: GRANT-free two-phase server-side resolve
Landing needs the RESOLVED campaign theme but `so_themes`/`so_clients` secrets are never anon. Design: **Phase A** anon client confirms the campaign is published+visible (unchanged); **Phase B** a NEW dedicated `resolvePublicCampaignTheme(campaignId, clientId)` on the SERVICE client selects ONLY theme columns (`so_campaigns.theme_id`/`brand`; `so_clients.theme_id`/`theme`/`tenant_id`; `tenants.theme_id`/`theme`; `so_themes.tokens`) → `fetchThemeTokens` ×3 → 3-tier resolve → returns `ResolvedTheme`. **CRITICAL:** do NOT reuse `resolveClientRow`/`resolveCampaign` (they select `resend_api_key`/`gmail_app_password`) — dedicated non-secret projection; a test asserts the select excludes secret columns. Order is load-bearing: anon-confirm-published FIRST, service-resolve SECOND (else service-role reads unpublished themes). so_themes stays anon-REVOKEd. Exposing `ResolvedTheme` (hex tokens + logoUrl/fontFamily) to anon violates no rule (non-secret; = roadmap #4).

## Landing consumption: additive dual-write, `brand` kept indefinitely
Landing today reads ONLY `brand.logo_url` (all colours are hardcoded literals) → low risk. Endpoint returns BOTH `brand` (unchanged) AND `theme: ResolvedTheme`. Derive `brand` FROM the resolved theme (inverse `BRAND_TO_THEME`) so named-theme-only campaigns keep a populated `logo_url`. Sequencing: CMS deploy #1 additive (brand+theme) → landing migrates to `theme` on its own deploy → keep `brand` as a permanent compat alias (removal buys nothing, is the only step that can break the landing). `theme` optional on the landing type.

## Migration: `so_campaigns.theme_id`, NO seed
`ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL`. **so_campaigns uses a column-scoped authenticated allow-list** (verified `20260708201755:49-51` + `20260710120000:84-86`, 14 cols) → MUST re-assert `GRANT SELECT (…14 cols…, theme_id) TO authenticated` (else CMS read fails `permission denied for column theme_id`). Anon grant UNTOUCHED (theme_id auto-hidden from anon; rule #2 preserved). NO seed/reconcile for campaigns (unlike client/tenant) — existing `brand` stays inline fallback, theme_id NULL → byte-identical render. `assertThemeOwnedIfPresent` on campaign create/update writes (cross-tenant guard, same as client).

## UX: ONE "Wygląd kampanii" card, 3-way mode
New `CampaignThemeCard` (venture-local wrapper) in the campaign editor RIGHT column (move from left, match client editor). Card-level amber public banner (hoisted from CampaignBrandEditor — a library theme is also public). 3-way RadioGroup: (1) **Dziedziczy z klienta** → theme_id=null + brand=null; (2) **Wybierz z biblioteki** → `ThemePicker level='campaign' hideModeRadio` (combobox + chip only; wrapper owns the outer radio) → theme_id; (3) **Własny wygląd** → the existing `CampaignBrandEditor` verbatim (freeform brand, the dominant per-campaign case + live contract). `ThemePreview` below (3-tier resolved). Existing brand campaigns open in mode 3 (byte-identical). "Zapisz jako motyw w bibliotece" link = post-MVP. `ThemePicker` change: add `'campaign'` to level union + `hideModeRadio?` prop (keep picker generic; wrapper orchestrates modes).

## Iterations (per-iter validation)
- **E1 (DB):** so_campaigns.theme_id migration (FK SET NULL + authenticated allow-list re-assert +theme_id + anon untouched + NO seed) + types. Verify has_column_privilege.
- **E2 (resolver+backend):** `brandToThemeTokens` + resolver 3-tier (byte-identical test) + thread campaign tier into ingest `sendBonusEmail` + `assertThemeOwnedIfPresent` on campaign writes. Tests.
- **E3 (public endpoint):** two-phase server-side resolve + `theme: ResolvedTheme` on PublicCampaign (brand kept, derived) + secret-exclusion boundary test.
- **E4 (UI):** CampaignThemeCard 3-way + ThemePicker level='campaign'/hideModeRadio + ThemePreview + banner hoist + messages, wired into VentureCampaignEditor.
- Landing repo migration = SEPARATE, later, additive (not this worktree).
