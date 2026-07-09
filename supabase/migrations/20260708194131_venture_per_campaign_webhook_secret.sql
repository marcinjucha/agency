-- ==========================================
-- Venture Bonus Funnel — per-campaign Tally webhook secret + per-campaign idempotency
-- ==========================================
-- Builds on 20260705120000_create_venture_bonus_funnel.sql (iter-1, already applied to staging).
--
-- Two changes:
--   1. so_campaigns.tally_webhook_secret — move the Tally webhook signing secret from a global
--      env var to per-campaign in the DB. Server-only; NOT exposed to anon.
--   2. Fix the lead idempotency key for the per-creator-form model: Tally submission IDs are
--      unique only WITHIN a form/account, so the global UNIQUE(tally_submission_id) can collide
--      across two different creators' forms. Change to composite UNIQUE(campaign_id, tally_submission_id).

-- ==========================================
-- SECTION 1: so_campaigns.tally_webhook_secret (per-campaign, server-only)
-- ==========================================

ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS tally_webhook_secret TEXT;

COMMENT ON COLUMN so_campaigns.tally_webhook_secret IS
  'Per-campaign Tally webhook signing secret. Server-only: MUST NOT be exposed to anon '
  '(deliberately absent from the anon column GRANT below). Used to verify the Tally-Signature '
  'header on POST /api/venture/leads/:slug. NULL when the campaign''s webhook is not yet configured.';

-- Column-level anon exposure hardening (see iter-1 rationale). The iter-1 GRANT is already
-- column-level and lists only public-safe columns (id, slug, display_name, brand, published).
-- Because column-level GRANTs are explicit allow-lists, a newly-added column is NOT readable by
-- anon unless named here — tally_webhook_secret is intentionally omitted, so anon cannot read it.
-- Re-assert the exact iter-1 grant defensively (idempotent) to make the anon-safe surface explicit
-- alongside the new column and guard against any drift. This does NOT weaken any existing grant:
-- it lists the identical column set as iter-1 (esp_* + tally_webhook_secret stay excluded).
REVOKE SELECT ON so_campaigns FROM anon;
GRANT SELECT (id, slug, display_name, brand, published) ON so_campaigns TO anon;

-- Mgmt RLS unchanged: the iter-1 authenticated SELECT/UPDATE policies on so_campaigns
-- (scoped via so_clients.tenant_id) already let tenant operators read and set this column.
-- No RLS change is needed or made here.

-- ==========================================
-- SECTION 2: Per-campaign lead idempotency
-- ==========================================
-- iter-1 declared `tally_submission_id TEXT UNIQUE` as a column-level constraint, which
-- PostgreSQL auto-named `so_leads_tally_submission_id_key`. Drop it and replace with a
-- composite unique on (campaign_id, tally_submission_id).
--
-- Dedup is now PER-CAMPAIGN: the ingest path keys on (campaign_id, tally_submission_id)
-- (select-then-insert — see agency-partial-unique-index-on-conflict), never on
-- tally_submission_id alone.

ALTER TABLE so_leads
  DROP CONSTRAINT IF EXISTS so_leads_tally_submission_id_key;

ALTER TABLE so_leads
  ADD CONSTRAINT so_leads_campaign_submission_key
    UNIQUE (campaign_id, tally_submission_id);

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Anon cannot read the secret (column not granted):
--   SET ROLE anon; SELECT tally_webhook_secret FROM so_campaigns; RESET ROLE; -- expect ERROR: permission denied for column
--   SET ROLE anon; SELECT id, slug, published FROM so_campaigns WHERE published = true; RESET ROLE; -- OK (granted cols)
-- Composite idempotency in place, old global unique gone:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'so_leads'::regclass AND contype = 'u';
--     -- expect: so_leads_campaign_submission_key ; expect NOT: so_leads_tally_submission_id_key
-- Then: npm run db:types  &&  grep "tally_webhook_secret" packages/database/src/types.ts
