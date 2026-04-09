-- Multi-provider Calendar — Iteration 1 (AAA-T-126)
-- Creates calendar_connections table with pgcrypto-encrypted credentials
-- Creates calendar_connections_decrypted view (security_invoker = true)
-- Adds calendar_connection_id FK to survey_links
-- Genericizes appointments table (replaces google_calendar_event_id)
-- Drops users.google_calendar_token (credentials now in calendar_connections)
--
-- Verification steps:
--   supabase db reset
--   SELECT * FROM calendar_connections LIMIT 1;
--   SELECT * FROM calendar_connections_decrypted LIMIT 1;
--   SET ROLE authenticated; SELECT * FROM calendar_connections; RESET ROLE;
--   SET ROLE anon; SELECT * FROM calendar_connections; RESET ROLE; -- should return rows (needed for booking flow)
--   \d survey_links -- should show calendar_connection_id column
--   \d appointments -- should show calendar_event_id, calendar_provider, calendar_connection_id; NO google_calendar_event_id

-- Ensure pgcrypto is available (needed for encrypted credentials)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- SECTION 1: calendar_connections table
-- ============================================================

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'caldav')),
  display_name TEXT NOT NULL,
  credentials_encrypted BYTEA NOT NULL,
  calendar_url TEXT,
  account_identifier TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider, account_identifier)
);

-- Only one default per tenant (tenant-level, not per-user)
CREATE UNIQUE INDEX idx_calendar_connections_one_default
  ON calendar_connections (tenant_id) WHERE is_default = true AND user_id IS NULL;

-- Indexes
CREATE INDEX idx_calendar_connections_tenant
  ON calendar_connections (tenant_id);
CREATE INDEX idx_calendar_connections_active
  ON calendar_connections (tenant_id, provider) WHERE is_active = true;

-- updated_at trigger (reuses existing update_updated_at() from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SECTION 2: RLS on calendar_connections
-- ============================================================

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Authenticated: full CRUD scoped to tenant
CREATE POLICY "Tenant users can view calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- Anon: SELECT only (website booking flow needs to resolve calendar connection)
CREATE POLICY "Anon can view calendar connections"
  ON calendar_connections FOR SELECT
  TO anon
  USING (is_active = true);

-- ============================================================
-- SECTION 3: calendar_connections_decrypted view
-- ============================================================

-- PREREQUISITE: app.encryption_key GUC (already configured for marketplace)
-- See 20260402200000_create_marketplace_schema.sql for GUC setup docs.
--
-- credentials_encrypted stores different JSON shapes per provider:
--   Google: { access_token, refresh_token, expiry_date, scope, email }
--   CalDAV: { url, username, password }

CREATE VIEW calendar_connections_decrypted
WITH (security_invoker = true) AS
SELECT
  id,
  tenant_id,
  user_id,
  provider,
  display_name,
  extensions.pgp_sym_decrypt(credentials_encrypted, current_setting('app.encryption_key'))::jsonb AS credentials,
  calendar_url,
  account_identifier,
  is_default,
  is_active,
  last_verified_at,
  created_at,
  updated_at
FROM calendar_connections;

-- ============================================================
-- SECTION 4: Grants
-- ============================================================

-- Authenticated: full CRUD on base table
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_connections TO authenticated;

-- Authenticated: read-only on decrypted view (credentials visible only to tenant users)
GRANT SELECT ON calendar_connections_decrypted TO authenticated;

-- Anon: read-only on base table (booking flow resolves connection, no credentials exposed)
GRANT SELECT ON calendar_connections TO anon;

-- ============================================================
-- SECTION 5: survey_links — add calendar_connection_id FK
-- ============================================================

ALTER TABLE survey_links
  ADD COLUMN calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE SET NULL;

COMMENT ON COLUMN survey_links.calendar_connection_id IS
  'Optional calendar connection for booking flow. NULL = plain survey without booking.';

-- ============================================================
-- SECTION 6: appointments — genericize (remove Google-specific column)
-- ============================================================

-- Add new generic columns
ALTER TABLE appointments
  ADD COLUMN calendar_event_id TEXT,
  ADD COLUMN calendar_provider TEXT,
  ADD COLUMN calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE SET NULL;

-- Migrate existing Google Calendar data
UPDATE appointments
  SET calendar_event_id = google_calendar_event_id,
      calendar_provider = 'google'
  WHERE google_calendar_event_id IS NOT NULL;

-- Drop old Google-specific column
ALTER TABLE appointments DROP COLUMN google_calendar_event_id;

-- Index for looking up appointments by calendar connection
CREATE INDEX idx_appointments_calendar_connection
  ON appointments (calendar_connection_id) WHERE calendar_connection_id IS NOT NULL;

COMMENT ON COLUMN appointments.calendar_event_id IS
  'Provider-agnostic event ID (Google event ID, CalDAV UID, etc.)';
COMMENT ON COLUMN appointments.calendar_provider IS
  'Which provider created this event (google, caldav)';
COMMENT ON COLUMN appointments.calendar_connection_id IS
  'Which calendar connection was used to create this event';

-- ============================================================
-- SECTION 7: Drop users.google_calendar_token
-- ============================================================

-- Credentials now stored encrypted in calendar_connections table.
-- No migration of existing tokens needed (user confirmed: just drop).
ALTER TABLE users DROP COLUMN IF EXISTS google_calendar_token;

-- Drop the now-obsolete comment (column is gone, but clean up any references)
-- COMMENT ON COLUMN is automatically dropped when column is dropped.

-- ============================================================
-- SECTION 8: Comments
-- ============================================================

COMMENT ON TABLE calendar_connections IS
  'Per-tenant calendar provider connections (Google, CalDAV). Credentials stored encrypted via pgcrypto.';
COMMENT ON VIEW calendar_connections_decrypted IS
  'Decrypted view of calendar_connections. Uses security_invoker=true to respect RLS. Requires app.encryption_key GUC.';
