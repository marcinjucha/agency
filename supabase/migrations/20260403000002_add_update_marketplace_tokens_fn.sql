-- Update marketplace tokens by connection ID
-- Purpose: n8n Token Refresh workflow needs to update OAuth tokens for an existing connection.
-- Existing upsert_marketplace_connection operates by (tenant_id, marketplace) — not suitable for UPDATE by PK.
--
-- SECURITY DEFINER: required for pgp_sym_encrypt via app.encryption_key GUC
-- SET search_path: security best practice (prevents search_path hijacking)
--
-- Verification steps:
--   supabase db reset
--   SET app.encryption_key = 'test-key';
--   -- Insert a connection first via upsert_marketplace_connection, then:
--   SELECT update_marketplace_tokens(
--     '<connection-id>'::UUID,
--     'new-access-token',
--     'new-refresh-token',
--     now() + interval '1 hour'
--   );
--   SELECT access_token, refresh_token FROM shop_marketplace_connections_decrypted WHERE id = '<connection-id>';

CREATE OR REPLACE FUNCTION update_marketplace_tokens(
  p_connection_id UUID,
  p_access_token  TEXT,
  p_refresh_token TEXT,
  p_token_expires_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE shop_marketplace_connections
  SET
    access_token_encrypted  = pgp_sym_encrypt(p_access_token,  current_setting('app.encryption_key')),
    refresh_token_encrypted = pgp_sym_encrypt(p_refresh_token, current_setting('app.encryption_key')),
    token_expires_at = p_token_expires_at,
    is_active = true,
    updated_at = now()
  WHERE id = p_connection_id;
END;
$$;

-- Grant to service_role implicitly (bypasses grants).
-- Grant to authenticated for CMS-initiated token refreshes.
GRANT EXECUTE ON FUNCTION update_marketplace_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION update_marketplace_tokens IS
  'Updates OAuth tokens for an existing marketplace connection by PK. '
  'Used by n8n Token Refresh workflow. Encrypts tokens via pgp_sym_encrypt. '
  'SECURITY DEFINER for app.encryption_key GUC access.';
