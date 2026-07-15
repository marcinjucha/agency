-- ==========================================
-- Venture campaign template_variable_values — per-campaign template variable overrides
-- ==========================================
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- WHAT this migration does (the ONLY schema changes):
--   1. so_campaigns.template_variable_values JSONB NOT NULL DEFAULT '{}'::jsonb.
--      A flat map of { "<templateTokenKey>": "<literalValue>" } (e.g.
--      {"bonus_1_url":"https://...","companyName":"Acme"}). Empty object = no overrides.
--      Holds the values a CMS user fills into their selected email template's variables,
--      per campaign.
--   2. Re-assert the so_campaigns AUTHENTICATED column allow-list with
--      template_variable_values appended.
--
-- WHY the anon grant on so_campaigns is INTENTIONALLY UNTOUCHED:
--   template_variable_values is a CMS-internal authenticated-only admin concern; the public
--   landing must NOT read it. As a NEW column it is auto-hidden from the narrow anon
--   allow-list (id, slug, display_name, brand, published) — LOCKED anon contract preserved
--   with zero action. DO NOT add template_variable_values to anon.
--   The public read paths (getPublishedCampaignBySlug / public-theme) select explicit
--   fixed column lists (never *), so this column is not exposed there either.

-- ==========================================
-- SECTION 1: so_campaigns.template_variable_values
-- ==========================================
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS template_variable_values JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN so_campaigns.template_variable_values IS
  'Flat JSONB map { "<templateTokenKey>": "<literalValue>" } of the values a CMS user fills '
  'into the campaign''s selected email-template variables. NOT NULL, defaults to ''{}''::jsonb '
  '(empty object = no per-campaign overrides). Authenticated-only — NOT anon-readable '
  '(excluded from the anon allow-list).';

-- ==========================================
-- SECTION 2: re-assert the so_campaigns AUTHENTICATED column allow-list + template_variable_values
-- ==========================================
-- so_campaigns uses a COLUMN-scoped authenticated allow-list (blanket SELECT was REVOKEd in
-- 20260708201755 to hide plaintext tally_webhook_secret; last re-asserted in 20260714150000 with
-- email_template_id — 16 columns). A NEW column is not covered, so an authenticated .select()
-- including template_variable_values would fail-loud "permission denied for column
-- template_variable_values". Re-assert the EXACT 16-column list from 20260714150000:55-57 verbatim
-- + template_variable_values (17 columns).
REVOKE SELECT ON so_campaigns FROM authenticated;
GRANT SELECT (id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref,
              esp_tag_launch, published, created_at, updated_at, has_webhook_secret,
              lead_source_provider, lead_source_config, theme_id, email_template_id,
              template_variable_values)
  ON so_campaigns TO authenticated;

-- ==========================================
-- SECTION 3: anon grant — deliberately UNTOUCHED (see header). DO NOT add template_variable_values to anon.
-- ==========================================

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
--   \d so_campaigns  -- template_variable_values jsonb NOT NULL DEFAULT '{}'::jsonb
--   SELECT has_column_privilege('authenticated','so_campaigns','template_variable_values','SELECT'); -- t
--   SELECT has_column_privilege('anon',         'so_campaigns','template_variable_values','SELECT'); -- f
--   SET ROLE authenticated; SELECT template_variable_values FROM so_campaigns LIMIT 1; RESET ROLE; -- OK
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "template_variable_values" packages/database/src/types.ts   -- so_campaigns Row/Insert/Update
