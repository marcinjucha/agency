-- Marketplace token encryption function — upsert_marketplace_connection()
-- SECURITY DEFINER: callable from CMS API routes and n8n (service_role)
-- Handles encrypted token storage via pgcrypto (pgp_sym_encrypt)
-- pgcrypto already enabled in initial_schema (20250105000001)
--
-- NULL account_id handling:
--   PostgreSQL UNIQUE(tenant_id, marketplace, account_id) treats NULLs as distinct,
--   so ON CONFLICT never matches rows with NULL account_id.
--   Solution: two-phase logic — explicit SELECT for NULL account_id case,
--   ON CONFLICT for non-NULL account_id case.
--
-- Verification steps:
--   supabase db reset
--   -- Test insert with NULL account_id:
--   SET app.encryption_key = 'test-key';
--   SELECT upsert_marketplace_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     'allegro', 'token-abc', NULL, NULL, NULL, NULL, NULL, NULL
--   );
--   SELECT * FROM shop_marketplace_connections;
--
--   -- Test upsert same tenant+marketplace with NULL account_id (should UPDATE, not INSERT):
--   SELECT upsert_marketplace_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     'allegro', 'token-xyz', 'refresh-xyz', NULL, NULL, NULL, NULL, NULL
--   );
--   SELECT count(*) FROM shop_marketplace_connections; -- should be 1
--
--   -- Test upsert with account_id (ON CONFLICT path):
--   SELECT upsert_marketplace_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     'allegro', 'token-acc', NULL, NULL, 'acc-123', 'My Store', NULL, NULL
--   );
--   SELECT count(*) FROM shop_marketplace_connections; -- should be 2
--
--   -- Test decrypted view:
--   SELECT access_token, refresh_token FROM shop_marketplace_connections_decrypted;
--
--   -- Test GRANT:
--   SET ROLE authenticated;
--   SELECT upsert_marketplace_connection(
--     '19342448-4e4e-49ba-8bf0-694d5376f953'::UUID,
--     'test', 'token', NULL, NULL, NULL, NULL, NULL, NULL
--   );
--   RESET ROLE;

CREATE OR REPLACE FUNCTION upsert_marketplace_connection(
  p_tenant_id UUID,
  p_marketplace TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_account_id TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_scopes TEXT[] DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id UUID;
  v_encryption_key TEXT;
BEGIN
  v_encryption_key := current_setting('app.encryption_key');

  -- When account_id is NULL, ON CONFLICT (tenant_id, marketplace, account_id)
  -- never matches because NULLs are distinct in PostgreSQL UNIQUE constraints.
  -- Handle NULL account_id with explicit SELECT + UPDATE/INSERT.
  IF p_account_id IS NULL THEN
    -- Look for existing connection with NULL account_id for this tenant+marketplace
    SELECT id INTO v_connection_id
    FROM shop_marketplace_connections
    WHERE tenant_id = p_tenant_id
      AND marketplace = p_marketplace
      AND account_id IS NULL;

    IF v_connection_id IS NOT NULL THEN
      -- UPDATE existing NULL-account_id connection
      UPDATE shop_marketplace_connections
      SET
        access_token_encrypted = pgp_sym_encrypt(p_access_token, v_encryption_key),
        refresh_token_encrypted = CASE WHEN p_refresh_token IS NOT NULL
          THEN pgp_sym_encrypt(p_refresh_token, v_encryption_key)
          ELSE refresh_token_encrypted
        END,
        token_expires_at = COALESCE(p_token_expires_at, token_expires_at),
        account_name = COALESCE(p_account_name, account_name),
        scopes = COALESCE(p_scopes, scopes),
        display_name = COALESCE(p_display_name, display_name),
        is_active = true,
        updated_at = now()
      WHERE id = v_connection_id;

      RETURN v_connection_id;
    END IF;

    -- No existing row — INSERT new connection with NULL account_id
    INSERT INTO shop_marketplace_connections (
      tenant_id, marketplace, display_name,
      access_token_encrypted, refresh_token_encrypted,
      token_expires_at, account_id, account_name, scopes, is_active
    ) VALUES (
      p_tenant_id, p_marketplace, p_display_name,
      pgp_sym_encrypt(p_access_token, v_encryption_key),
      CASE WHEN p_refresh_token IS NOT NULL
        THEN pgp_sym_encrypt(p_refresh_token, v_encryption_key)
        ELSE NULL
      END,
      p_token_expires_at, NULL, p_account_name, p_scopes, true
    )
    RETURNING id INTO v_connection_id;

    RETURN v_connection_id;
  END IF;

  -- When account_id is NOT NULL, ON CONFLICT works correctly
  INSERT INTO shop_marketplace_connections (
    tenant_id, marketplace, display_name,
    access_token_encrypted, refresh_token_encrypted,
    token_expires_at, account_id, account_name, scopes, is_active
  ) VALUES (
    p_tenant_id, p_marketplace, p_display_name,
    pgp_sym_encrypt(p_access_token, v_encryption_key),
    CASE WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, v_encryption_key)
      ELSE NULL
    END,
    p_token_expires_at, p_account_id, p_account_name, p_scopes, true
  )
  ON CONFLICT (tenant_id, marketplace, account_id)
  DO UPDATE SET
    access_token_encrypted = pgp_sym_encrypt(p_access_token, v_encryption_key),
    refresh_token_encrypted = CASE WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, v_encryption_key)
      ELSE shop_marketplace_connections.refresh_token_encrypted
    END,
    token_expires_at = COALESCE(p_token_expires_at, shop_marketplace_connections.token_expires_at),
    account_id = COALESCE(p_account_id, shop_marketplace_connections.account_id),
    account_name = COALESCE(p_account_name, shop_marketplace_connections.account_name),
    scopes = COALESCE(p_scopes, shop_marketplace_connections.scopes),
    display_name = COALESCE(p_display_name, shop_marketplace_connections.display_name),
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

-- Grant to authenticated (CMS users) — service_role bypasses grants automatically
GRANT EXECUTE ON FUNCTION upsert_marketplace_connection(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT[], TEXT) TO authenticated;

COMMENT ON FUNCTION upsert_marketplace_connection IS
  'Upserts a marketplace connection with encrypted tokens via pgp_sym_encrypt. '
  'Handles NULL account_id (NULLs are distinct in UNIQUE constraints) via explicit SELECT+UPDATE. '
  'Non-NULL account_id uses standard ON CONFLICT. SECURITY DEFINER for service_role and authenticated callers.';
