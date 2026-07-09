-- ==========================================
-- Venture Bonus Funnel — per-client friendly "From" sender name
-- ==========================================
-- Builds on:
--   20260709163651_venture_client_mail_provider.sql (so_clients mail-sender provider config
--     + REVOKE SELECT / allow-list GRANT hiding the secret columns).
-- All applied to staging (mqabjtxtywsmehzijmko).
--
-- WHY a separate sender_name on so_clients (the client / brand owner):
--   The bonus email sent via the client's Gmail SMTP (or their own Resend) showed a bare address
--   as the "From" header in the recipient's inbox (e.g. mjucha92@gmail.com) instead of a friendly
--   brand label (e.g. "Przystań Inwestorów"). This is the client's BRAND name, shared across all of
--   that client's campaigns — so it belongs on so_clients, one per client.
--   so_campaigns.display_name is NOT reusable here: it is the CAMPAIGN name (e.g. "Warsztaty"),
--   not the client's brand.
--
-- NOT a secret: this friendly name is deliberately visible in every outgoing email's "From" header.
-- Plain nullable column, no REVOKE/hardening of its own — but it MUST be added to the existing
-- authenticated SELECT allow-list (see below), or the admin UI's explicit .select(...) fails-loud
-- with "permission denied for column sender_name".

-- ==========================================
-- SECTION 1: New column on so_clients
-- ==========================================

ALTER TABLE so_clients
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

COMMENT ON COLUMN so_clients.sender_name IS
  'Not secret: friendly "From" display name shown in the recipient''s inbox for this client''s '
  'outgoing bonus emails (e.g. "Przystań Inwestorów"). Client brand name, shared across all of '
  'the client''s campaigns. NULL falls back to the bare sender address. Distinct from '
  'so_campaigns.display_name, which is the campaign name, not the brand.';

-- ==========================================
-- SECTION 2: Re-assert the authenticated SELECT allow-list to include sender_name
-- ==========================================
-- 20260709163651 revoked the blanket table-level SELECT from authenticated and granted an explicit
-- 11-column allow-list. A new column is NOT covered by that grant, so authenticated reads of
-- sender_name would fail with "permission denied for column". Re-assert the full allow-list with
-- sender_name appended (byte-identical to the handler's .select(...) column list). Only SELECT is
-- affected; INSERT/UPDATE stay at Supabase's default role grants, so the admin write path is intact.
REVOKE SELECT ON so_clients FROM authenticated;
GRANT SELECT (id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address,
              has_resend_api_key, has_gmail_app_password, sender_name, created_at, updated_at)
  ON so_clients TO authenticated;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
--   SET ROLE authenticated; SELECT sender_name FROM so_clients LIMIT 1; RESET ROLE; -- OK (now in allow-list)
--   SET ROLE authenticated; SELECT gmail_app_password FROM so_clients LIMIT 1; RESET ROLE; -- still ERROR: permission denied (secret unchanged)
--   UPDATE so_clients SET sender_name = 'Przystań Inwestorów' WHERE slug = 'przystan-inwestorow'; -- writable
-- Then: npm run db:types  &&  grep "sender_name" packages/database/src/types.ts
