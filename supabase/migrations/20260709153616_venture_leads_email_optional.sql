-- ==========================================
-- Venture bonus funnel: make so_leads.email OPTIONAL
-- ==========================================
--
-- WHY: email was originally NOT NULL (created in 20260705120000_create_venture_bonus_funnel.sql)
-- because it is the key used for ESP-sync (audience upsert) and for delivering the bonus email.
-- The operator decided that capturing the lead itself has value even WITHOUT a contact email
-- (e.g. analysing survey/consent responses, RODO/GDPR consent tracking) — so a submission with
-- no email must still be persisted rather than hard-rejected (previously 400 `missing_email`).
--
-- This is safe because the two email-dependent side effects are ALREADY tolerant of a missing
-- dependency, mirroring the existing no-lead-drop pattern (esp_audience_ref absent -> skip ESP
-- sync, keep the lead): when email IS NULL the ESP-sync and bonus-mail steps simply no-op, and
-- the lead row is retained.
--
-- No other object depends on the NOT NULL constraint:
--   * no unique index / partial index references email (the only UNIQUE on so_leads is
--     tally_submission_id, redefined per-campaign in 20260708194131_venture_per_campaign_webhook_secret.sql)
--   * no RLS policy references email (tenant isolation goes campaign -> client -> tenant_id)
--   * no generated column depends on email
--
-- Idempotent: DROP NOT NULL is a no-op if the column is already nullable.

ALTER TABLE so_leads ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN so_leads.email IS
  'Lead contact email. OPTIONAL — a lead with no email is still persisted; ESP-sync and the '
  'bonus email are skipped (no-op) when NULL, matching the no-lead-drop tolerance pattern.';
