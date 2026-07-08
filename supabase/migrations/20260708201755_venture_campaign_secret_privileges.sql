-- ==========================================
-- Venture Bonus Funnel — campaign webhook secret privileges
-- ==========================================
-- Builds on:
--   20260705120000_create_venture_bonus_funnel.sql (iter-1 — so_* schema + RLS + anon column grant)
--   20260708194131_venture_per_campaign_webhook_secret.sql (added so_campaigns.tally_webhook_secret)
-- Both already applied to staging (mqabjtxtywsmehzijmko).
--
-- Goal: make the plaintext Tally webhook signing secret readable ONLY by the service role,
-- and expose a safe boolean the authenticated admin UI can read instead.
--
-- WHY: the admin CRUD (authenticated cookie client, apps/cms/features/venture/admin-handlers.server.ts)
-- now selects an explicit column list (ADMIN_CAMPAIGN_COLUMNS) that INCLUDES has_webhook_secret and
-- EXCLUDES tally_webhook_secret. RLS restricts ROWS, not COLUMNS — so without a column-level SELECT
-- revoke, a `select('*')` (or a misconfigured read) by the authenticated role could still leak the
-- plaintext secret. This migration makes the post-migration shape real:
--   1. Add the derived boolean has_webhook_secret (STORED generated column).
--   2. Revoke authenticated's blanket SELECT and re-grant only the safe allow-list (== ADMIN_CAMPAIGN_COLUMNS),
--      which excludes tally_webhook_secret.
-- The webhook verify path (resolveCampaign in ingest.server.ts) uses the SERVICE role client, which
-- bypasses column grants — it keeps reading the raw secret. Not touched here.

-- ==========================================
-- SECTION 1: Derived boolean (safe existence signal for authenticated/UI)
-- ==========================================
-- STORED generated column: its value is materialized, so reading it does NOT require SELECT on the
-- underlying tally_webhook_secret column — it survives the REVOKE in SECTION 2.
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS has_webhook_secret boolean
    GENERATED ALWAYS AS (tally_webhook_secret IS NOT NULL) STORED;

COMMENT ON COLUMN so_campaigns.has_webhook_secret IS
  'Derived: whether a Tally webhook signing secret is configured. Safe to expose to authenticated/UI — never reveals the plaintext (which is service-role-read-only).';

-- ==========================================
-- SECTION 2: Make the plaintext secret service-role-read-only
-- ==========================================
-- Same allow-list pattern iter-1 used for anon. A bare column-level REVOKE on top of an existing
-- table grant is unreliable, so REVOKE the whole SELECT then GRANT the explicit safe column set.
-- This allow-list is EXACTLY ADMIN_CAMPAIGN_COLUMNS from admin-handlers.server.ts — it must match,
-- or the authenticated admin reads break. It deliberately EXCLUDES tally_webhook_secret.
--
-- Only SELECT is revoked. INSERT/UPDATE/DELETE for authenticated come from Supabase's default role
-- grants (iter-1 never scoped them per-column), so the admin write path that sets/rotates the secret
-- through the campaign editor is unaffected — tally_webhook_secret stays writable.
--
-- The anon grant (iter-1: id, slug, display_name, brand, published) is intentionally left as-is —
-- the public read does not need has_webhook_secret.
REVOKE SELECT ON so_campaigns FROM authenticated;
GRANT SELECT (id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref, esp_tag_launch, published, created_at, updated_at, has_webhook_secret)
  ON so_campaigns TO authenticated;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- has_webhook_secret readable by authenticated, plaintext denied:
--   SET ROLE authenticated; SELECT has_webhook_secret FROM so_campaigns LIMIT 1;      RESET ROLE; -- OK
--   SET ROLE authenticated; SELECT tally_webhook_secret FROM so_campaigns LIMIT 1;    RESET ROLE; -- expect ERROR: permission denied for column tally_webhook_secret
--   SET ROLE authenticated; SELECT * FROM so_campaigns LIMIT 1;                       RESET ROLE; -- expect ERROR: permission denied for column tally_webhook_secret
-- Write path unaffected (INSERT/UPDATE privilege still present at table level):
--   SELECT has_table_privilege('authenticated', 'so_campaigns', 'INSERT');  -- expect t
--   SELECT has_table_privilege('authenticated', 'so_campaigns', 'UPDATE');  -- expect t
-- Then: npm run db:types  &&  grep "has_webhook_secret" packages/database/src/types.ts
