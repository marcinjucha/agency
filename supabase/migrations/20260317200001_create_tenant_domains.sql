-- Create tenant_domains table for multi-domain support
-- Maps custom domains and subdomains to tenants for website routing
--
-- Verification steps:
--   SELECT * FROM tenant_domains LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM tenant_domains; RESET ROLE;
--   SET ROLE anon; SELECT * FROM tenant_domains; RESET ROLE; -- should return all rows (website middleware needs this)

CREATE TABLE tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  domain_type TEXT NOT NULL DEFAULT 'subdomain' CHECK (domain_type IN ('subdomain', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for domain resolution (website middleware hot path)
CREATE INDEX idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX idx_tenant_domains_tenant ON tenant_domains(tenant_id);

-- RLS
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see only their tenant's domains
CREATE POLICY "Users can view own tenant domains"
  ON tenant_domains FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- SELECT: anon can read all domains (website middleware resolves domain → tenant_id without auth)
CREATE POLICY "Anyone can view domains"
  ON tenant_domains FOR SELECT
  TO anon
  USING (true);
