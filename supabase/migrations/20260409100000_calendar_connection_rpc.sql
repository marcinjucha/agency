-- Multi-provider Calendar — Iteration 3 prerequisite (AAA-T-126)
-- RPC functions for encrypted credential storage in calendar_connections
-- Follows the same pattern as upsert_marketplace_connection (20260402200001)
--
-- SECURITY DEFINER: needed because pgp_sym_encrypt reads app.encryption_key GUC
-- which is not accessible to regular authenticated users.
--
-- NULL account_identifier handling:
--   PostgreSQL UNIQUE(tenant_id, provider, account_identifier) treats NULLs as distinct,
--   so ON CONFLICT never matches rows with NULL account_identifier.
--   Solution: two-phase logic — explicit SELECT for NULL case, ON CONFLICT for non-NULL.
--
-- Verification steps:
--   supabase db reset
--
--   -- Test insert with NULL account_identifier:
--   SET app.encryption_key = 'test-key';
--   SELECT upsert_calendar_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     NULL::UUID,
--     'google',
--     'My Google Calendar',
--     '{"access_token":"abc","refresh_token":"xyz"}'
--   );
--   SELECT * FROM calendar_connections;
--
--   -- Test upsert same tenant+provider with NULL account_identifier (should UPDATE):
--   SELECT upsert_calendar_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     NULL::UUID,
--     'google',
--     'Updated Name',
--     '{"access_token":"new","refresh_token":"new"}'
--   );
--   SELECT count(*) FROM calendar_connections; -- should be 1
--
--   -- Test with account_identifier (ON CONFLICT path):
--   SELECT upsert_calendar_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     NULL::UUID,
--     'caldav',
--     'CalDAV Server',
--     '{"url":"https://cal.example.com","username":"user","password":"pass"}',
--     'https://cal.example.com',
--     'user@example.com'
--   );
--   SELECT count(*) FROM calendar_connections; -- should be 2
--
--   -- Test update_calendar_credentials:
--   SELECT update_calendar_credentials(
--     (SELECT id FROM calendar_connections LIMIT 1),
--     '{"access_token":"refreshed","refresh_token":"refreshed"}'
--   );
--
--   -- Test decrypted view:
--   SELECT credentials FROM calendar_connections_decrypted;
--
--   -- Test GRANTs:
--   SET ROLE authenticated;
--   SELECT upsert_calendar_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID, NULL::UUID,
--     'google', 'Test', '{"token":"test"}'
--   );
--   RESET ROLE;

-- ============================================================
-- FUNCTION 1: upsert_calendar_connection
-- ============================================================

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
  -- Fallback to default for local dev where GUC can't be persisted via ALTER DATABASE
  v_encryption_key := COALESCE(
    NULLIF(current_setting('app.encryption_key', true), ''),
    'local-dev-encryption-key'
  );

  -- If this connection should be the default, unset all other defaults for this tenant
  -- (tenant-level defaults only, where user_id IS NULL)
  IF p_is_default THEN
    UPDATE calendar_connections
    SET is_default = false, updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND user_id IS NULL
      AND is_default = true;
  END IF;

  -- When account_identifier is NULL, ON CONFLICT (tenant_id, provider, account_identifier)
  -- never matches because NULLs are distinct in PostgreSQL UNIQUE constraints.
  -- Handle NULL account_identifier with explicit SELECT + UPDATE/INSERT.
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

  -- When account_identifier is NOT NULL, ON CONFLICT works correctly
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

-- Grant to authenticated (CMS users) — service_role bypasses grants automatically
GRANT EXECUTE ON FUNCTION upsert_calendar_connection(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION upsert_calendar_connection IS
  'Upserts a calendar connection with encrypted credentials via pgp_sym_encrypt. '
  'Handles NULL account_identifier (NULLs are distinct in UNIQUE constraints) via explicit SELECT+UPDATE. '
  'Non-NULL account_identifier uses standard ON CONFLICT. '
  'When p_is_default=true, clears other tenant-level defaults first.';

-- ============================================================
-- FUNCTION 2: update_calendar_credentials
-- ============================================================

CREATE OR REPLACE FUNCTION update_calendar_credentials(
  p_connection_id UUID,
  p_credentials_json TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_encryption_key TEXT;
BEGIN
  -- Fallback to default for local dev where GUC can't be persisted via ALTER DATABASE
  v_encryption_key := COALESCE(
    NULLIF(current_setting('app.encryption_key', true), ''),
    'local-dev-encryption-key'
  );

  UPDATE calendar_connections
  SET
    credentials_encrypted = pgp_sym_encrypt(p_credentials_json, v_encryption_key),
    updated_at = now()
  WHERE id = p_connection_id;
END;
$$;

-- Grant to authenticated (CMS) + service_role (website booking flow token refresh)
GRANT EXECUTE ON FUNCTION update_calendar_credentials(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_calendar_credentials(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION update_calendar_credentials IS
  'Updates only the encrypted credentials for a calendar connection. '
  'Used for Google OAuth token refresh (access_token rotation). '
  'Granted to service_role for website booking flow callback.';
