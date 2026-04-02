-- Revoke direct access to decrypted marketplace credentials view
-- Only service_role (which bypasses grants) should read plaintext OAuth tokens
REVOKE ALL ON shop_marketplace_connections_decrypted FROM authenticated, anon;
