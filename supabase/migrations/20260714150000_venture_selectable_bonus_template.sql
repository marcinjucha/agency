-- ==========================================
-- Venture selectable bonus email-template library — Phase 4, Increment 1 (DATA-MODEL ONLY)
-- ==========================================
-- Design ratified by 5-member council. No TS/resolver/UI here (those are later increments).
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- WHAT this migration does (order within the file matters):
--   1. email_templates.is_default marker (boolean).
--   2. Backfill the single existing venture_bonus row per tenant as the default.
--   3. Relax the system-singleton partial unique index to ALSO exempt 'venture_bonus'.
--   4. Guarantee at most ONE default venture_bonus per tenant.
--   5. so_campaigns.email_template_id FK (nullable, ON DELETE SET NULL).
--   6. Re-assert the so_campaigns AUTHENTICATED column allow-list with email_template_id appended.
--
-- WHY venture_bonus JOINS workflow_custom in the singleton exemption:
--   'venture_bonus' becomes a NAMED LIBRARY (many rows per tenant) — a campaign SELECTS its bonus
--   template from that library (so_campaigns.email_template_id below). Like 'workflow_custom', it must
--   therefore be allowed MANY-per-tenant, so it is removed from the "1-per-tenant system type" predicate.
--   Every OTHER type (e.g. form_confirmation) stays a strict singleton.
--
-- WHY is_default:
--   The deterministic null-resolution anchor. When a campaign has email_template_id IS NULL (or its FK
--   was NULLed by an ON DELETE SET NULL), the venture send path resolves to the tenant's DEFAULT
--   venture_bonus template. is_default marks exactly that fallback row; the partial unique index in
--   SECTION 4 guarantees the anchor is single-valued per tenant (no ambiguity).
--
-- WHY the FK is ON DELETE SET NULL:
--   Preserves the venture-bonus "no-drop send contract" — deleting a template row must NEVER cascade-delete
--   a campaign nor block the send. On template delete the campaign's email_template_id falls back to NULL,
--   and the send path resolves to the tenant default (is_default). (memory.md: every new FK to a
--   delete-guarded reference table must also be wired into that table's app-level usage counter — a
--   later-increment TS step; this migration only lays the column + FK.)
--
-- WHY the anon grant on so_campaigns is INTENTIONALLY UNTOUCHED:
--   email_template_id is an authenticated-only admin concern; the public landing must not read it.
--   As a NEW column it is auto-hidden from the narrow anon allow-list (id, slug, display_name, brand,
--   published) — LOCKED anon contract preserved with zero action. DO NOT add email_template_id to anon.
--
-- NOTE (memory gotcha): the partial unique indexes below CANNOT be ON CONFLICT arbiters — any future
--   seed/create of a venture_bonus row must be INSERT ... WHERE NOT EXISTS or select-then-update.
-- NOTE: email_templates uses a TABLE-LEVEL authenticated grant → is_default is auto-visible, NO grant
--   re-assert needed for email_templates (only so_campaigns is column-scoped).

-- ==========================================
-- SECTION 1: is_default marker on email_templates
-- ==========================================
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN email_templates.is_default IS
  'Deterministic null-resolution anchor for the venture_bonus named library. When a campaign has '
  'email_template_id IS NULL (or it was NULLed by ON DELETE SET NULL), the venture send path resolves '
  'to the tenant''s default venture_bonus row (is_default = true). At most one default per tenant is '
  'enforced by email_templates_venture_bonus_default_uidx.';

-- ==========================================
-- SECTION 2: backfill the existing default (exactly one venture_bonus row per tenant today)
-- ==========================================
UPDATE email_templates
  SET is_default = true
  WHERE type = 'venture_bonus' AND is_default = false;

-- ==========================================
-- SECTION 3: relax the system-singleton index to ALSO exempt venture_bonus
-- ==========================================
-- Original (20260331000000:36-38): 1-per-tenant for every type EXCEPT workflow_custom.
-- New intent: singleton for every type EXCEPT workflow_custom AND venture_bonus (both are many-per-tenant).
DROP INDEX IF EXISTS email_templates_tenant_type_system_unique;
CREATE UNIQUE INDEX email_templates_tenant_type_system_unique
  ON email_templates (tenant_id, type)
  WHERE type NOT IN ('workflow_custom', 'venture_bonus');

-- ==========================================
-- SECTION 4: at most ONE default venture_bonus per tenant
-- ==========================================
CREATE UNIQUE INDEX email_templates_venture_bonus_default_uidx
  ON email_templates (tenant_id)
  WHERE type = 'venture_bonus' AND is_default;

-- ==========================================
-- SECTION 5: so_campaigns.email_template_id FK (nullable, ON DELETE SET NULL)
-- ==========================================
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN so_campaigns.email_template_id IS
  'Nullable FK -> email_templates(id), ON DELETE SET NULL. Per-campaign selection of a venture_bonus '
  'template from the tenant''s named library. NULL = use the tenant default venture_bonus '
  '(email_templates.is_default). ON DELETE SET NULL preserves the venture-bonus no-drop send contract. '
  'Authenticated-only — NOT anon-readable (excluded from the anon allow-list).';

-- ==========================================
-- SECTION 6: re-assert the so_campaigns AUTHENTICATED column allow-list + email_template_id
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
-- SECTION 7: anon grant — deliberately UNTOUCHED (see header). DO NOT add email_template_id to anon.
-- ==========================================

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
--   \d email_templates   -- is_default column + email_templates_tenant_type_system_unique (new predicate)
--                        --   + email_templates_venture_bonus_default_uidx
--   \d so_campaigns      -- email_template_id column + FK ON DELETE SET NULL
--   SELECT tenant_id, is_default FROM email_templates WHERE type = 'venture_bonus'; -- is_default = true
--   SELECT has_column_privilege('authenticated','so_campaigns','email_template_id','SELECT'); -- t
--   SELECT has_column_privilege('anon',         'so_campaigns','email_template_id','SELECT'); -- f
--   SET ROLE authenticated; SELECT email_template_id FROM so_campaigns LIMIT 1; RESET ROLE; -- OK
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "is_default" packages/database/src/types.ts          -- email_templates Row/Insert/Update
--   grep -n "email_template_id" packages/database/src/types.ts   -- so_campaigns Row/Insert/Update
