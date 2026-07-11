-- ==========================================
-- Venture Client Theming — per-org + per-client theme JSONB
-- ==========================================
-- Builds on:
--   20260709163651_venture_client_mail_provider.sql (so_clients REVOKE SELECT + column allow-list
--     GRANT that hides the plaintext secret columns).
--   20260709170000_venture_client_sender_name.sql   (re-asserted the allow-list with sender_name).
-- Applied to staging (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- WHY this migration (Iter 1a — SCHEMA + GRANTs ONLY, no TS/domain code):
--   Client theming needs a per-org theme (tenants.theme) and a per-client override
--   (so_clients.theme). Both are plain nullable JSONB with NO DEFAULT.
--
-- WHY no DB default on either column:
--   The resolver (Iter 1b) owns the fallback chain (client theme -> tenant theme -> hardcoded
--   Halo Efekt default). A DB-level DEFAULT would be a SECOND source of default-truth that can
--   drift from the resolver's hardcoded default. NULL = "no theme set here, ask the next level up".

-- ==========================================
-- SECTION 1: tenants.theme (per-org theme)
-- ==========================================
-- tenants uses Supabase's default table-level authenticated GRANT (verified: no column-scoped
-- REVOKE exists on tenants), so this new column is auto-visible to authenticated — NO GRANT
-- re-assert is needed. tenants has no anon policy — left as-is.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS theme JSONB;

COMMENT ON COLUMN tenants.theme IS
  'Nullable, no default: per-org theme config (colors/typography/etc.). NULL means "no org theme '
  'set" — the resolver falls back to the hardcoded Halo Efekt default. Not a secret. The resolver '
  '(not the DB) owns the fallback chain, so this column intentionally has no DB DEFAULT.';

-- ==========================================
-- SECTION 2: so_clients.theme (per-client override)
-- ==========================================
ALTER TABLE so_clients
  ADD COLUMN IF NOT EXISTS theme JSONB;

COMMENT ON COLUMN so_clients.theme IS
  'Nullable, no default: per-client theme override. NULL means "no client override" — the resolver '
  'falls back to tenants.theme, then to the hardcoded Halo Efekt default. Not a secret. Distinct '
  'from so_campaigns.brand (campaign-level). No DB DEFAULT (resolver owns the fallback chain).';

-- ==========================================
-- SECTION 3: Re-assert the authenticated SELECT allow-list to include theme
-- ==========================================
-- 20260709163651 revoked the blanket table-level SELECT from authenticated and granted an explicit
-- column allow-list; 20260709170000 re-asserted it with sender_name (12 columns). A new column is
-- NOT covered by that grant, so authenticated reads of theme (e.g. the CMS theme editor) would fail
-- with "permission denied for column theme". Re-assert the full allow-list with theme appended.
-- Only SELECT is affected; INSERT/UPDATE stay at Supabase's default role grants, so the admin write
-- path is intact.
REVOKE SELECT ON so_clients FROM authenticated;
GRANT SELECT (id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address,
              has_resend_api_key, has_gmail_app_password, sender_name, created_at, updated_at, theme)
  ON so_clients TO authenticated;

-- ==========================================
-- SECTION 4: anon GRANT on so_clients — deliberately UNTOUCHED
-- ==========================================
-- The anon allow-list stays the narrow `GRANT SELECT (id, slug) ON so_clients TO anon`
-- (20260709141553:89). theme is NOT anon-exposed in this worktree: the email resolver runs
-- service-role (bypasses RLS + GRANTs), so no public role needs theme here.
--
-- DEFERRED public-exposure constraint (council finding d):
--   If so_clients.theme ever needs to be anon-readable (a public landing consuming the client
--   theme), EXTEND the existing narrow `GRANT SELECT (id, slug, ...) ON so_clients TO anon`
--   allow-list — NEVER a table-level `GRANT SELECT ON so_clients TO anon`, because so_clients
--   co-locates plaintext secrets resend_api_key / gmail_app_password; a table-level anon grant
--   would leak them. PREFER routing any public-landing theme through so_campaigns.brand (already
--   anon-granted, contains no secrets) instead of exposing so_clients.theme to anon at all.

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
--   SET ROLE authenticated; SELECT theme FROM so_clients LIMIT 1; RESET ROLE;
--     -- OK (theme now in the authenticated allow-list)
--   SET ROLE authenticated; SELECT resend_api_key FROM so_clients LIMIT 1; RESET ROLE;
--     -- ERROR: permission denied for column resend_api_key (secret unchanged)
--   SET ROLE authenticated; SELECT theme FROM tenants LIMIT 1; RESET ROLE;
--     -- OK (tenants uses the table-level default authenticated grant)
--   SET ROLE anon; SELECT theme FROM so_clients LIMIT 1; RESET ROLE;
--     -- ERROR: permission denied for column theme (not in the anon (id, slug) allow-list)
--
-- Column-privilege spot checks (no role switch):
--   SELECT has_column_privilege('authenticated', 'so_clients', 'theme', 'SELECT');       -- expect t
--   SELECT has_column_privilege('authenticated', 'so_clients', 'resend_api_key', 'SELECT'); -- expect f
--   SELECT has_column_privilege('anon', 'so_clients', 'theme', 'SELECT');                 -- expect f
--   SELECT has_column_privilege('authenticated', 'tenants', 'theme', 'SELECT');           -- expect t
--
-- Then: npm run db:types  &&  grep "theme" packages/database/src/types.ts
