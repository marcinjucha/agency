-- Marketplace Integration schema — Iteration 1 (AAA-T-157)
-- Creates 3 tables (shop_marketplace_connections, shop_marketplace_listings, shop_marketplace_imports)
-- Creates 1 decrypted view (shop_marketplace_connections_decrypted)
-- pgcrypto already enabled in initial_schema (20250105000001)
--
-- Verification steps:
--   supabase db reset
--   SELECT * FROM shop_marketplace_connections LIMIT 1;
--   SELECT * FROM shop_marketplace_listings LIMIT 1;
--   SELECT * FROM shop_marketplace_imports LIMIT 1;
--   SELECT * FROM shop_marketplace_connections_decrypted LIMIT 1;
--   SET ROLE authenticated; SELECT * FROM shop_marketplace_connections; RESET ROLE;
--   SET ROLE anon; SELECT * FROM shop_marketplace_connections; RESET ROLE; -- should return 0 rows
--   SET ROLE authenticated; SELECT * FROM shop_marketplace_imports; RESET ROLE; -- SELECT only
--   SET ROLE anon; SELECT * FROM shop_marketplace_imports; RESET ROLE; -- should return 0 rows

-- Ensure pgcrypto is available (needed for decrypted view)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- SECTION 1: shop_marketplace_connections
-- ============================================================

CREATE TABLE shop_marketplace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  display_name TEXT,
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,
  account_name TEXT,
  scopes TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, marketplace, account_id)
);

-- Indexes
CREATE INDEX idx_shop_marketplace_connections_tenant
  ON shop_marketplace_connections (tenant_id);
CREATE INDEX idx_shop_marketplace_connections_active
  ON shop_marketplace_connections (tenant_id, marketplace) WHERE is_active = true;

-- updated_at trigger (reuses existing update_updated_at() from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shop_marketplace_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shop_marketplace_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view marketplace connections"
  ON shop_marketplace_connections FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert marketplace connections"
  ON shop_marketplace_connections FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update marketplace connections"
  ON shop_marketplace_connections FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete marketplace connections"
  ON shop_marketplace_connections FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- No anon policies — marketplace connections are admin-only

-- ============================================================
-- SECTION 2: shop_marketplace_connections_decrypted (VIEW)
-- ============================================================

-- PREREQUISITE: app.encryption_key GUC
-- This view uses current_setting('app.encryption_key') for pgp_sym_decrypt.
-- The key MUST be set before SELECT on this view, otherwise PostgreSQL throws:
--   ERROR: unrecognized configuration parameter "app.encryption_key"
--
-- Production (Supabase Cloud):
--   ALTER DATABASE postgres SET "app.encryption_key" = 'your-secret-key-here';
--   Or: Supabase Dashboard > Database > Postgres Config > Custom Postgres Config
--
-- Local dev:
--   Add to supabase/config.toml under [db.settings]:
--     "app.encryption_key" = "local-dev-key"
--   Or run: ALTER DATABASE postgres SET "app.encryption_key" = 'local-dev-key';

-- HOW TO INSERT ENCRYPTED TOKENS:
-- INSERT INTO shop_marketplace_connections (
--   tenant_id, marketplace, access_token_encrypted, refresh_token_encrypted, ...
-- ) VALUES (
--   $1, $2,
--   pgp_sym_encrypt($access_token, current_setting('app.encryption_key')),
--   pgp_sym_encrypt($refresh_token, current_setting('app.encryption_key')),
--   ...
-- );

CREATE VIEW shop_marketplace_connections_decrypted
WITH (security_invoker = true) AS
SELECT
  id,
  tenant_id,
  marketplace,
  display_name,
  extensions.pgp_sym_decrypt(access_token_encrypted, current_setting('app.encryption_key')) AS access_token,
  extensions.pgp_sym_decrypt(refresh_token_encrypted, current_setting('app.encryption_key')) AS refresh_token,
  token_expires_at,
  account_id,
  account_name,
  scopes,
  is_active,
  last_synced_at,
  created_at,
  updated_at
FROM shop_marketplace_connections;

-- ============================================================
-- SECTION 3: shop_marketplace_listings
-- ============================================================

CREATE TABLE shop_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES shop_marketplace_connections(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  external_listing_id TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'publishing', 'active', 'sold', 'expired', 'removed', 'error')),
  marketplace_category_id TEXT,
  marketplace_location JSONB,
  marketplace_params JSONB,
  last_sync_status TEXT
    CHECK (last_sync_status IN ('ok', 'error', 'pending')),
  last_sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_listing_id)
);

-- Indexes
CREATE INDEX idx_shop_marketplace_listings_product
  ON shop_marketplace_listings (product_id);
CREATE INDEX idx_shop_marketplace_listings_connection
  ON shop_marketplace_listings (connection_id);
CREATE INDEX idx_shop_marketplace_listings_status
  ON shop_marketplace_listings (tenant_id, status);
CREATE INDEX idx_shop_marketplace_listings_external
  ON shop_marketplace_listings (marketplace, external_listing_id) WHERE external_listing_id IS NOT NULL;

-- updated_at trigger (reuses existing update_updated_at() from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shop_marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shop_marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view marketplace listings"
  ON shop_marketplace_listings FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert marketplace listings"
  ON shop_marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update marketplace listings"
  ON shop_marketplace_listings FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete marketplace listings"
  ON shop_marketplace_listings FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- No anon policies — marketplace listings are admin-only

-- ============================================================
-- SECTION 4: shop_marketplace_imports
-- ============================================================

CREATE TABLE shop_marketplace_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES shop_marketplace_connections(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_items INTEGER,
  imported_items INTEGER NOT NULL DEFAULT 0,
  skipped_items INTEGER NOT NULL DEFAULT 0,
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_shop_marketplace_imports_connection
  ON shop_marketplace_imports (connection_id);
CREATE INDEX idx_shop_marketplace_imports_status
  ON shop_marketplace_imports (tenant_id, status, created_at DESC);

-- No updated_at trigger (no updated_at column)

-- RLS: SELECT ONLY for authenticated (read-only — n8n/service_role writes)
ALTER TABLE shop_marketplace_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view marketplace imports"
  ON shop_marketplace_imports FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- No INSERT/UPDATE/DELETE policies — service_role writes bypass RLS
-- No anon policies — marketplace imports are admin-only
