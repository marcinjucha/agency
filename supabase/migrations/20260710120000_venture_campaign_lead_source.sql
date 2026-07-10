-- ==========================================
-- Venture Bonus Funnel — lead-source provider discriminator + non-secret config
-- ==========================================
-- Builds on:
--   20260705120000_create_venture_bonus_funnel.sql (iter-1 — so_* schema, esp_* discriminator, anon grant)
--   20260708201755_venture_campaign_secret_privileges.sql (authenticated REVOKE SELECT + 12-col allow-list)
--   20260709120000_venture_scoped_access.sql (so_campaigns authenticated RLS via can_access_so_client)
-- All applied to staging (mqabjtxtywsmehzijmko).
--
-- Iteration 2a (DB) of the lead-source plugin feature. Iter 1 (code) extracted a
-- LeadSourceProvider registry; the ingest route already resolves
--   getLeadSource(toLeadSourceId(campaign.lead_source_provider ?? 'tally'))
-- but lead_source_provider was only an optional seam on CampaignRow, not a real column.
-- This migration makes the column real so:
--   - a DRAFT campaign (no provider chosen yet) is representable (NULL = draft), and
--   - future providers (Google Forms, etc.) declare themselves per campaign.
--
-- Mirrors the esp_provider discriminator precedent from iter-1: a plain TEXT provider column
-- + a JSONB config bag for NON-SECRET provider settings. Secrets stay in dedicated columns
-- (so_campaigns.tally_webhook_secret), NEVER in lead_source_config.
--
-- Additive ONLY: ADD COLUMN IF NOT EXISTS + a naturally-idempotent backfill UPDATE. No rename,
-- no drop, no RLS change (plain columns ride on the already-scoped so_campaigns row from
-- 20260709120000 — the authenticated SELECT/UPDATE policies already gate access; new columns
-- inherit that gating). No CHECK constraint: the provider set is registry-extensible, validated
-- at the app/Zod boundary (z.string() + registry membership) per the type-safe-domain-constants
-- rule — adding a provider must never require a migration.

-- ==========================================
-- SECTION 1: lead_source_provider — the per-campaign lead-source discriminator
-- ==========================================
-- NULLABLE, NO DEFAULT on purpose: NULL = draft / no lead source selected yet. A DEFAULT of
-- 'tally' would silently make every newly-inserted campaign a Tally campaign and erase the
-- draft state, so it is deliberately omitted (contrast esp_provider, which DEFAULTs 'beehiiv').
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS lead_source_provider TEXT;

COMMENT ON COLUMN so_campaigns.lead_source_provider IS
  'Per-campaign lead-source discriminator (registry-extensible: ''tally'' today, Google Forms etc. '
  'later). NULLABLE with NO default: NULL = DRAFT (no lead source chosen yet). New rows stay NULL; '
  'existing rows were backfilled to ''tally''. Validated app-side against the LeadSourceProvider '
  'registry (z.string() + membership), NOT a DB CHECK — adding a provider needs no migration.';

-- ==========================================
-- SECTION 2: One-time backfill — every EXISTING campaign is implicitly Tally
-- ==========================================
-- Pre-migration every campaign ingested via Tally (they carry tally_webhook_secret and hit the
-- /leads/:slug Tally webhook). Backfilling existing rows to 'tally' preserves their behavior; the
-- route no longer needs its `?? 'tally'` fallback for these rows. Naturally idempotent (re-running
-- matches zero rows once backfilled). New rows inserted AFTER this migration stay NULL (no DEFAULT)
-- = draft, which is the intended new-campaign state.
UPDATE so_campaigns
SET lead_source_provider = 'tally'
WHERE lead_source_provider IS NULL;

-- ==========================================
-- SECTION 3: lead_source_config — NON-SECRET provider config bag
-- ==========================================
-- NOT NULL DEFAULT '{}' so every row (existing + new) has a usable empty object with no backfill
-- gap. For non-secret provider settings ONLY (e.g. a Google Forms form id / field mapping).
ALTER TABLE so_campaigns
  ADD COLUMN IF NOT EXISTS lead_source_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN so_campaigns.lead_source_config IS
  'NON-SECRET lead-source provider config only (e.g. Google Forms form id / field mapping). '
  'TRIPWIRE: NEVER store secrets here — signing secrets/API keys live in dedicated columns like '
  'so_campaigns.tally_webhook_secret (SELECT-revoked from authenticated, service-role-read-only). '
  'This JSONB is inside the authenticated SELECT allow-list and would leak any secret placed in it.';

-- ==========================================
-- SECTION 4: Re-assert the authenticated SELECT allow-list (+ 2 new columns)
-- ==========================================
-- 20260708201755 revoked authenticated's blanket SELECT and granted an explicit 12-column
-- allow-list (== ADMIN_CAMPAIGN_COLUMNS). New columns are NOT covered by that grant, so an
-- authenticated `.select(...)` including lead_source_provider / lead_source_config would fail-loud
-- with "permission denied for column". Re-assert the FULL allow-list with the 2 new columns
-- appended. This set MUST stay byte-identical to ADMIN_CAMPAIGN_COLUMNS + the 2 new columns in
-- apps/cms/features/venture/admin-handlers.server.ts (the developer step adds them there).
--
-- lead_source_provider / lead_source_config are internal wiring (like esp_*) — deliberately NOT
-- added to the anon grant (iter-1: id, slug, display_name, brand, published), which is left as-is.
-- Only SELECT is affected; INSERT/UPDATE stay at Supabase's default role grants, so the admin
-- write path that sets these columns is unaffected.
REVOKE SELECT ON so_campaigns FROM authenticated;
GRANT SELECT (id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref, esp_tag_launch, published, created_at, updated_at, has_webhook_secret, lead_source_provider, lead_source_config)
  ON so_campaigns TO authenticated;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Backfill — existing rows are all 'tally', none NULL:
--   SELECT count(*) FILTER (WHERE lead_source_provider = 'tally') AS tally,
--          count(*) FILTER (WHERE lead_source_provider IS NULL)  AS draft
--   FROM so_campaigns;  -- expect draft = 0 immediately post-migration
-- No default (a new row without the column set stays NULL = draft):
--   SELECT column_default FROM information_schema.columns
--   WHERE table_name = 'so_campaigns' AND column_name = 'lead_source_provider';  -- expect NULL
-- Config default:
--   SELECT DISTINCT lead_source_config FROM so_campaigns;  -- expect {}
-- Authenticated CAN read the new columns; anon CANNOT:
--   SET ROLE authenticated; SELECT lead_source_provider, lead_source_config FROM so_campaigns LIMIT 1; RESET ROLE; -- OK
--   SET ROLE anon; SELECT lead_source_provider FROM so_campaigns LIMIT 1; RESET ROLE; -- expect ERROR: permission denied for column
--   SET ROLE anon; SELECT lead_source_config FROM so_campaigns LIMIT 1;   RESET ROLE; -- expect ERROR: permission denied for column
-- Secret still hidden (unchanged):
--   SET ROLE authenticated; SELECT tally_webhook_secret FROM so_campaigns LIMIT 1; RESET ROLE; -- expect ERROR: permission denied
-- Then: npm run db:types  &&  grep "lead_source_provider" packages/database/src/types.ts
