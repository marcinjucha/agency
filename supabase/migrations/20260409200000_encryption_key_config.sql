-- Store encryption key in a config table instead of custom GUC
-- Supabase Cloud blocks ALTER DATABASE SET for custom app.* parameters.
-- This table is accessible to SECURITY DEFINER functions.
--
-- Only one row, protected by RLS (no access for any role — only SECURITY DEFINER functions read it).

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Lock it down: no RLS policies = no access via PostgREST/API
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- No GRANT to authenticated/anon — only superuser and SECURITY DEFINER functions can read
-- (SECURITY DEFINER runs as the function owner = postgres, bypasses RLS)

-- Seed the encryption key (production: change this value after deploy!)
INSERT INTO app_config (key, value)
VALUES ('encryption_key', 'CHANGE-ME-IN-PRODUCTION')
ON CONFLICT (key) DO NOTHING;

-- Helper function to read the key (used by encrypt/decrypt functions)
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT value INTO v_key FROM app_config WHERE key = 'encryption_key';
  IF v_key IS NULL OR v_key = 'CHANGE-ME-IN-PRODUCTION' THEN
    -- Fallback for local dev
    RETURN 'local-dev-encryption-key';
  END IF;
  RETURN v_key;
END;
$$;

-- Now update calendar RPC functions to use get_encryption_key() instead of current_setting()

CREATE OR REPLACE FUNCTION upsert_calendar_connection(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_provider TEXT DEFAULT 'google',
  p_display_name TEXT DEFAULT 'Calendar',
  p_credentials_json TEXT DEFAULT '{}',
  p_calendar_url TEXT DEFAULT NULL,
  p_account_identifier TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_connection_id UUID;
  v_encryption_key TEXT;
BEGIN
  v_encryption_key := get_encryption_key();

  IF p_is_default THEN
    UPDATE calendar_connections
    SET is_default = false, updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND user_id IS NULL
      AND is_default = true;
  END IF;

  IF p_account_identifier IS NULL THEN
    SELECT id INTO v_connection_id
    FROM calendar_connections
    WHERE tenant_id = p_tenant_id
      AND provider = p_provider
      AND account_identifier IS NULL;

    IF v_connection_id IS NOT NULL THEN
      UPDATE calendar_connections
      SET
        credentials_encrypted = pgp_sym_encrypt(p_credentials_json, v_encryption_key),
        display_name = COALESCE(p_display_name, display_name),
        calendar_url = COALESCE(p_calendar_url, calendar_url),
        user_id = COALESCE(p_user_id, user_id),
        is_default = p_is_default,
        is_active = true,
        updated_at = now()
      WHERE id = v_connection_id;
      RETURN v_connection_id;
    END IF;

    INSERT INTO calendar_connections (
      tenant_id, user_id, provider, display_name,
      credentials_encrypted, calendar_url, account_identifier,
      is_default, is_active
    ) VALUES (
      p_tenant_id, p_user_id, p_provider, p_display_name,
      pgp_sym_encrypt(p_credentials_json, v_encryption_key),
      p_calendar_url, NULL,
      p_is_default, true
    )
    RETURNING id INTO v_connection_id;
    RETURN v_connection_id;
  END IF;

  INSERT INTO calendar_connections (
    tenant_id, user_id, provider, display_name,
    credentials_encrypted, calendar_url, account_identifier,
    is_default, is_active
  ) VALUES (
    p_tenant_id, p_user_id, p_provider, p_display_name,
    pgp_sym_encrypt(p_credentials_json, v_encryption_key),
    p_calendar_url, p_account_identifier,
    p_is_default, true
  )
  ON CONFLICT (tenant_id, provider, account_identifier)
  DO UPDATE SET
    credentials_encrypted = pgp_sym_encrypt(p_credentials_json, v_encryption_key),
    display_name = COALESCE(p_display_name, calendar_connections.display_name),
    calendar_url = COALESCE(p_calendar_url, calendar_connections.calendar_url),
    user_id = COALESCE(p_user_id, calendar_connections.user_id),
    is_default = p_is_default,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_calendar_credentials(
  p_connection_id UUID,
  p_credentials_json TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE calendar_connections
  SET
    credentials_encrypted = pgp_sym_encrypt(p_credentials_json, get_encryption_key()),
    updated_at = now()
  WHERE id = p_connection_id;
END;
$$;

-- Update the decrypted view to use get_encryption_key()
DROP VIEW IF EXISTS calendar_connections_decrypted;
CREATE VIEW calendar_connections_decrypted
WITH (security_invoker = true) AS
SELECT
  id, tenant_id, user_id, provider, display_name,
  extensions.pgp_sym_decrypt(credentials_encrypted, get_encryption_key())::jsonb AS credentials,
  calendar_url, account_identifier, is_default, is_active,
  last_verified_at, created_at, updated_at
FROM calendar_connections;

-- Re-grant on recreated view
GRANT SELECT ON calendar_connections_decrypted TO authenticated;
