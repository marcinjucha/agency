-- Create pages table for per-tenant page builder (WordPress-like CMS)
-- Supports block-based content editing with SEO metadata and publishing workflow
--
-- Verification steps:
--   SELECT * FROM pages LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM pages; RESET ROLE;
--   SET ROLE anon; SELECT * FROM pages; RESET ROLE; -- should return only published pages

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'page' CHECK (page_type IN ('page', 'landing', 'blog_listing', 'blog_post_template')),
  blocks JSONB NOT NULL DEFAULT '[]',
  seo_metadata JSONB,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Indexes for common query patterns
CREATE INDEX idx_pages_tenant ON pages(tenant_id);
CREATE INDEX idx_pages_tenant_slug ON pages(tenant_id, slug);
CREATE INDEX idx_pages_published ON pages(is_published) WHERE is_published = true;

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see only their tenant's pages
-- Uses current_user_tenant_id() helper (SECURITY DEFINER) — avoids RLS infinite recursion
CREATE POLICY "Users can view own tenant pages"
  ON pages FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- INSERT: authenticated users can create pages for their own tenant
CREATE POLICY "Users can insert own tenant pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- UPDATE: authenticated users can update their own tenant's pages
CREATE POLICY "Users can update own tenant pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- DELETE: authenticated users can delete their own tenant's pages
CREATE POLICY "Users can delete own tenant pages"
  ON pages FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- SELECT: anon can read published pages (public website reads)
-- No tenant filter needed — website resolves pages by domain+slug, not tenant_id
CREATE POLICY "Anyone can view published pages"
  ON pages FOR SELECT
  TO anon
  USING (is_published = true);
