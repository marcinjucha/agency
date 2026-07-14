-- ==========================================
-- Venture selectable bonus email-template — Phase 4 (MODEL B, DATA-MODEL ONLY)
-- ==========================================
-- Design ratified by 5-member council; Phase 4 PIVOTED to MODEL B. No TS/resolver/UI here.
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- MODEL B (this file): a campaign SELECTS any bonus-capable email template BY ID.
--   * 'venture_bonus' stays a strict per-tenant SINGLETON (like every other non-workflow_custom
--     type) — the single seeded venture_bonus row IS the tenant default. There is NO is_default
--     column: the fixed 'venture_bonus' slug is itself the default anchor.
--   * so_campaigns.email_template_id (nullable FK) picks the campaign's template from the library;
--     NULL falls back to the tenant's venture_bonus singleton.
--   Model A (is_default marker + per-tenant default index + venture_bonus singleton relaxation)
--   was over-built and is NOT part of Model B.
--
-- WHAT this migration does (the ONLY schema change):
--   1. so_campaigns.email_template_id FK (nullable, ON DELETE SET NULL).
--   2. Re-assert the so_campaigns AUTHENTICATED column allow-list with email_template_id appended.
--
-- WHY the FK is ON DELETE SET NULL:
--   Preserves the venture-bonus "no-drop send contract" — deleting a template row must NEVER
--   cascade-delete a campaign nor block the send. On template delete the campaign's
--   email_template_id falls back to NULL, and the send path resolves to the tenant's venture_bonus
--   singleton. (memory.md: every new FK to a delete-guarded reference table must also be wired into
--   that table's app-level usage counter — a later-increment TS step; this migration only lays the
--   column + FK.)
--
-- WHY the anon grant on so_campaigns is INTENTIONALLY UNTOUCHED:
--   email_template_id is an authenticated-only admin concern; the public landing must not read it.
--   As a NEW column it is auto-hidden from the narrow anon allow-list (id, slug, display_name,
--   brand, published) — LOCKED anon contract preserved with zero action. DO NOT add
--   email_template_id to anon.

-- ==========================================
-- SECTION 1: so_campaigns.email_template_id FK (nullable, ON DELETE SET NULL)
-- ==========================================
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN so_campaigns.email_template_id IS
  'Nullable FK -> email_templates(id), ON DELETE SET NULL. Per-campaign selection of a bonus-capable '
  'email template from the tenant''s library. NULL = use the tenant''s venture_bonus singleton (the '
  'default). ON DELETE SET NULL preserves the venture-bonus no-drop send contract. Authenticated-only '
  '— NOT anon-readable (excluded from the anon allow-list).';

-- ==========================================
-- SECTION 2: re-assert the so_campaigns AUTHENTICATED column allow-list + email_template_id
-- ==========================================
-- so_campaigns uses a COLUMN-scoped authenticated allow-list (blanket SELECT was REVOKEd in
-- 20260708201755 to hide plaintext tally_webhook_secret; last re-asserted in 20260711150000 with
-- theme_id — 15 columns). A NEW column is not covered, so authenticated .select() including
-- email_template_id would fail-loud "permission denied for column email_template_id". Re-assert the
-- EXACT 15-column list from 20260711150000:62-64 verbatim + email_template_id (16 columns).
REVOKE SELECT ON so_campaigns FROM authenticated;
GRANT SELECT (id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref,
              esp_tag_launch, published, created_at, updated_at, has_webhook_secret,
              lead_source_provider, lead_source_config, theme_id, email_template_id)
  ON so_campaigns TO authenticated;

-- ==========================================
-- SECTION 3: anon grant — deliberately UNTOUCHED (see header). DO NOT add email_template_id to anon.
-- ==========================================

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
--   \d so_campaigns      -- email_template_id column + FK ON DELETE SET NULL
--   \d email_templates   -- NO is_default column; email_templates_tenant_type_system_unique has
--                        --   ORIGINAL predicate WHERE type != 'workflow_custom' (venture_bonus singleton)
--   SELECT has_column_privilege('authenticated','so_campaigns','email_template_id','SELECT'); -- t
--   SELECT has_column_privilege('anon',         'so_campaigns','email_template_id','SELECT'); -- f
--   SET ROLE authenticated; SELECT email_template_id FROM so_campaigns LIMIT 1; RESET ROLE; -- OK
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "email_template_id" packages/database/src/types.ts   -- so_campaigns Row/Insert/Update
--   grep -n "is_default" packages/database/src/types.ts          -- absent from email_templates
