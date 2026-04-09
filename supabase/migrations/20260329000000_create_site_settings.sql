-- Create site_settings table for org-level SEO configuration
-- Stores organization metadata, social links, and SEO defaults per tenant
--
-- Verification steps:
--   SELECT * FROM site_settings LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM site_settings; RESET ROLE;
--   SET ROLE anon; SELECT * FROM site_settings; RESET ROLE; -- should return all rows (website needs OG/JSON-LD)

CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_name TEXT,
  logo_url TEXT,
  default_og_image_url TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_twitter TEXT,
  google_site_verification TEXT,
  default_keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see only their tenant's settings
-- Uses current_user_tenant_id() helper (SECURITY DEFINER) — avoids RLS infinite recursion
CREATE POLICY "Users can view own tenant site settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- SELECT: anon users can read all site settings (website needs OG defaults, JSON-LD, GSC meta tag)
CREATE POLICY "Anon can view site settings"
  ON site_settings FOR SELECT
  TO anon
  USING (true);

-- INSERT: authenticated users can create settings for their own tenant
CREATE POLICY "Users can insert own tenant site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- UPDATE: authenticated users can update their own tenant's settings
CREATE POLICY "Users can update own tenant site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- No DELETE policy — settings row should never be deleted

-- Seed default row for Halo Efekt tenant (only if tenant exists — safe for local dev)
INSERT INTO site_settings (tenant_id, organization_name)
SELECT '19342448-4e4e-49ba-8bf0-694d5376f953', 'Halo Efekt'
WHERE EXISTS (SELECT 1 FROM tenants WHERE id = '19342448-4e4e-49ba-8bf0-694d5376f953')
ON CONFLICT (tenant_id) DO NOTHING;
