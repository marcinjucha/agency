-- ==========================================
-- Venture Bonus Funnel — per-client mail-sender provider config
-- ==========================================
-- Builds on:
--   20260705120000_create_venture_bonus_funnel.sql (iter-1 — so_* schema + RLS)
--   20260708194131 / 20260708201755 (so_campaigns.tally_webhook_secret + service-role-only secret pattern)
-- All applied to staging (mqabjtxtywsmehzijmko).
--
-- WHY the config lives on so_clients (the creator), NOT on so_campaigns:
--   The mail-sender account (own Resend key / Gmail App Password) is a CLIENT-OWNED resource
--   shared across ALL of that client's campaigns. Putting it on the campaign would force the
--   operator to re-enter the same credentials per campaign. One config per creator = correct grain.
--
-- WHY both providers (own Resend + Gmail SMTP) ship together even though only one gets used:
--   They share the SAME secure-column mechanism (REVOKE SELECT + allow-list GRANT + STORED
--   "is-set" boolean), so building both now is nearly free. The final choice between them is a
--   product decision the user will make after talking to the creator — the infrastructure must be
--   ready for either. mail_provider = 'resend_shared' (default) preserves today's behavior (the
--   agency-global Resend fallback), so existing clients are unaffected until switched.
--
-- Secret columns (resend_api_key, gmail_app_password) are made service-role-read-only via the
-- exact tally_webhook_secret pattern: RLS restricts ROWS not COLUMNS, so a column-level REVOKE +
-- allow-list GRANT is required to stop a `select('*')` by the authenticated role leaking them.
-- The UI reads only the derived STORED booleans (has_resend_api_key / has_gmail_app_password).

-- ==========================================
-- SECTION 1: New columns on so_clients
-- ==========================================

ALTER TABLE so_clients
  ADD COLUMN IF NOT EXISTS mail_provider TEXT NOT NULL DEFAULT 'resend_shared',
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,       -- SECRET: client's own Resend API key
  ADD COLUMN IF NOT EXISTS resend_from_email TEXT,    -- NOT secret: verified sender address
  ADD COLUMN IF NOT EXISTS gmail_address TEXT,        -- NOT secret: Gmail address
  ADD COLUMN IF NOT EXISTS gmail_app_password TEXT;   -- SECRET: 16-char Google App Password

-- DB-level defense-in-depth (real validation lives in the Zod schema app-side).
ALTER TABLE so_clients
  DROP CONSTRAINT IF EXISTS so_clients_mail_provider_check;
ALTER TABLE so_clients
  ADD CONSTRAINT so_clients_mail_provider_check
    CHECK (mail_provider IN ('resend_shared', 'resend_own', 'gmail_smtp'));

COMMENT ON COLUMN so_clients.mail_provider IS
  'Which mail sender this client uses: resend_shared (agency-global Resend, default / today''s behavior), '
  'resend_own (client''s own Resend key), gmail_smtp (Gmail App Password via plain SMTP, NOT OAuth).';
COMMENT ON COLUMN so_clients.resend_api_key IS
  'SECRET — client''s own Resend API key (used when mail_provider = resend_own). Service-role-read-only '
  '(deliberately excluded from the authenticated column GRANT below). NULL when not configured.';
COMMENT ON COLUMN so_clients.resend_from_email IS
  'Not secret: verified sender address in the client''s own Resend account. Plain column.';
COMMENT ON COLUMN so_clients.gmail_address IS
  'Not secret: Gmail address used for gmail_smtp sending. Plain column.';
COMMENT ON COLUMN so_clients.gmail_app_password IS
  'SECRET — 16-char Google App Password for gmail_smtp (plain SMTP, NOT OAuth). Service-role-read-only '
  '(deliberately excluded from the authenticated column GRANT below). NULL when not configured.';

-- ==========================================
-- SECTION 2: Derived "is-set" booleans (safe existence signal for authenticated/UI)
-- ==========================================
-- STORED generated columns: values are materialized, so reading them does NOT require SELECT on the
-- underlying secret columns — they survive the REVOKE in SECTION 3.
ALTER TABLE so_clients
  ADD COLUMN IF NOT EXISTS has_resend_api_key boolean
    GENERATED ALWAYS AS (resend_api_key IS NOT NULL) STORED,
  ADD COLUMN IF NOT EXISTS has_gmail_app_password boolean
    GENERATED ALWAYS AS (gmail_app_password IS NOT NULL) STORED;

COMMENT ON COLUMN so_clients.has_resend_api_key IS
  'Derived: whether a client Resend API key is configured. Safe to expose to authenticated/UI — never reveals plaintext (service-role-read-only).';
COMMENT ON COLUMN so_clients.has_gmail_app_password IS
  'Derived: whether a Gmail App Password is configured. Safe to expose to authenticated/UI — never reveals plaintext (service-role-read-only).';

-- ==========================================
-- SECTION 3: Make the plaintext secrets service-role-read-only
-- ==========================================
-- iter-1 gave so_clients NO explicit column GRANT — it relied on Supabase's default table-level
-- SELECT grant to `authenticated` (rows filtered by RLS). To hide the two secret columns we must
-- REVOKE that blanket SELECT and GRANT an explicit allow-list of ALL non-secret columns. The
-- allow-list MUST stay byte-identical to the handler's explicit .select(...) column list, or the
-- authenticated admin reads fail-loud with "permission denied for column".
--
-- Only SELECT is revoked. INSERT/UPDATE/DELETE for authenticated come from Supabase's default role
-- grants (iter-1 never scoped them per-column), so the admin write path that sets/rotates the
-- secrets through the client editor is unaffected — the secret columns stay writable.
REVOKE SELECT ON so_clients FROM authenticated;
GRANT SELECT (id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address,
              has_resend_api_key, has_gmail_app_password, created_at, updated_at)
  ON so_clients TO authenticated;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Booleans readable by authenticated, plaintext secrets denied:
--   SET ROLE authenticated; SELECT has_gmail_app_password, has_resend_api_key FROM so_clients LIMIT 1; RESET ROLE; -- OK
--   SET ROLE authenticated; SELECT gmail_app_password FROM so_clients LIMIT 1;  RESET ROLE; -- expect ERROR: permission denied for column gmail_app_password
--   SET ROLE authenticated; SELECT resend_api_key FROM so_clients LIMIT 1;      RESET ROLE; -- expect ERROR: permission denied for column resend_api_key
--   SET ROLE authenticated; SELECT * FROM so_clients LIMIT 1;                   RESET ROLE; -- expect ERROR: permission denied for column
-- Write path unaffected (INSERT/UPDATE privilege still present at table level):
--   SELECT has_table_privilege('authenticated', 'so_clients', 'INSERT');  -- expect t
--   SELECT has_table_privilege('authenticated', 'so_clients', 'UPDATE');  -- expect t
-- CHECK constraint rejects bad provider:
--   INSERT INTO so_clients (tenant_id, name, slug, mail_provider) VALUES ('...', 'x', 'x', 'bad'); -- expect ERROR: check constraint
-- Then: npm run db:types  &&  grep "gmail_app_password" packages/database/src/types.ts
