-- ==========================================
-- Venture Campaign Theme — so_campaigns.theme_id FK to the named theme library
-- ==========================================
-- Iter E1 — DATA-MODEL LAYER ONLY (no TS/resolver/UI; those are E2/E3/E4).
-- Design ratified by 5-member council in docs/THEME_MANAGER_DESIGN.md ("Campaign tier").
--
-- Builds on:
--   20260711140000_venture_theme_library.sql (so_themes named library + the tenants/so_clients
--     theme_id FK pattern this migration MIRRORS: ADD COLUMN + FK ON DELETE SET NULL + authenticated
--     allow-list re-assert with theme_id appended).
--   20260710120000_venture_campaign_lead_source.sql:84-86 (the CURRENT so_campaigns authenticated
--     SELECT allow-list — 14 columns, == ADMIN_CAMPAIGN_COLUMNS).
--   20260708201755_venture_campaign_secret_privileges.sql (confirms so_campaigns uses a COLUMN-scoped
--     authenticated allow-list, not a blanket table grant — a bare ADD COLUMN would be invisible).
--   20260705120000_create_venture_bonus_funnel.sql:167-168 (the anon SELECT allow-list — left UNTOUCHED).
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- WHY the campaign tier (adds a 3rd tier below tenant + client):
--   theme_id primary → brandToThemeTokens(brand) inline fallback → inherit client → tenant → default.
--   Source of truth = the so_themes FK chain; the inline `brand` JSONB is authoritative ONLY when
--   theme_id IS NULL. brand stays a LIVE anon public contract (the landing reads it) — never mutated.
--
-- LOCKED RULES honored here:
--   1. so_themes stays authenticated-only — theme_id is a plain uuid FK, NOT anon-exposed.
--   2. named theme id is NEVER anon-readable — theme_id is a NEW column, so it is auto-hidden from the
--      anon column-scoped allow-list (which we do NOT touch). The landing reads the RESOLVED theme
--      server-side later (E3), not the named id.
--   4 (from 20260711140000). Campaign tier is now enabled — this migration is the deliberate addition
--      of so_campaigns.theme_id that 20260711140000 explicitly deferred.

-- ==========================================
-- SECTION 1: so_campaigns.theme_id FK (nullable, ON DELETE SET NULL)
-- ==========================================
-- Live reference (edit-once-propagates). NULL = "inherits from client" (resolver falls to
-- so_clients.theme_id, then tenants.theme_id, then hardcoded default). Distinct from the inline
-- `brand` fallback: brand is authoritative ONLY when theme_id IS NULL.
-- ON DELETE SET NULL + UI delete-guard (E2/E4) so deleting a theme never orphans a campaign.
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL;

COMMENT ON COLUMN so_campaigns.theme_id IS
  'Nullable FK -> so_themes(id), ON DELETE SET NULL. Per-campaign named theme assignment (the campaign '
  'tier). NULL = inherits from client (resolver falls to so_clients.theme_id, then tenants.theme_id, '
  'then hardcoded Halo Efekt default). Distinct from the inline `brand` fallback: source-of-truth = '
  'the so_themes FK chain, and `brand` is authoritative ONLY when theme_id IS NULL.';

-- ==========================================
-- SECTION 2: Re-assert the authenticated SELECT allow-list WITH theme_id appended
-- ==========================================
-- CRITICAL (same gotcha as lead_source_* in 20260710120000 and theme_id in 20260711140000):
-- so_campaigns uses a COLUMN-scoped authenticated allow-list (the blanket table SELECT was REVOKEd in
-- 20260708201755:49-51 to hide the plaintext tally_webhook_secret; re-asserted +2 cols in
-- 20260710120000:84-86). A NEW column is NOT covered by that grant, so an authenticated CMS
-- `.select(ADMIN_CAMPAIGN_COLUMNS)` including theme_id would fail-loud with
-- "permission denied for column theme_id". Re-assert the EXACT current 14-column list (verified verbatim
-- against 20260710120000:85-86 AND ADMIN_CAMPAIGN_COLUMNS in
-- apps/cms/features/venture/admin-handlers.server.ts:296) with theme_id appended (15 columns). This set
-- MUST stay byte-identical to ADMIN_CAMPAIGN_COLUMNS + theme_id (the E-series developer step adds
-- theme_id there). Only SELECT is affected; INSERT/UPDATE stay at Supabase's default role grants, so the
-- admin write path that sets theme_id is unaffected.
REVOKE SELECT ON so_campaigns FROM authenticated;
GRANT SELECT (id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref,
              esp_tag_launch, published, created_at, updated_at, has_webhook_secret,
              lead_source_provider, lead_source_config, theme_id)
  ON so_campaigns TO authenticated;

-- ==========================================
-- SECTION 3: anon grant — deliberately UNTOUCHED
-- ==========================================
-- The anon allow-list (20260705120000:167-168 — id, slug, display_name, brand, published) is left
-- exactly as-is. theme_id is a NEW column and is NOT in the anon grant, so it is auto-hidden from anon:
-- LOCKED RULE #2 (the named theme id is never anon-readable) is preserved with zero action here. The
-- public landing reads the RESOLVED theme server-side (E3 dedicated non-secret projection on the service
-- client), never the named theme_id. DO NOT add theme_id to the anon grant.

-- ==========================================
-- SECTION 4: NO seed / NO reconcile
-- ==========================================
-- Unlike the client/tenant inline-theme -> named-theme reconcile in 20260711140000 (SECTION 3),
-- campaigns are deliberately NOT promoted. Existing so_campaigns.brand stays as the inline campaign-tier
-- fallback; theme_id stays NULL → the resolver produces BYTE-IDENTICAL rendering to pre-migration.
-- WHY not promote: `brand` is anon-exposed AND a lossy 5-key partial (bg/logo_url/font/primary/accent) —
-- promoting it into so_themes would risk changing landing output and pollute the named theme library.

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Authenticated CAN read theme_id (it is in the re-asserted allow-list):
--   SET ROLE authenticated; SELECT theme_id FROM so_campaigns LIMIT 1; RESET ROLE; -- OK
-- Column-privilege spot checks (no role switch):
--   SELECT has_column_privilege('authenticated', 'so_campaigns', 'theme_id', 'SELECT'); -- expect t
--   SELECT has_column_privilege('anon',          'so_campaigns', 'theme_id', 'SELECT'); -- expect f (rule #2)
-- Landing contract intact — anon can still read brand (the campaign inline fallback):
--   SET ROLE anon; SELECT brand FROM so_campaigns WHERE published LIMIT 1; RESET ROLE; -- still OK
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "theme_id" packages/database/src/types.ts  -- theme_id: string | null on so_campaigns Row/Insert/Update
