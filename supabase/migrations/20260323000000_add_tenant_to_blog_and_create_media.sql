-- Media Library Iteration 1: Add tenant isolation to blog_posts + create media_items table
--
-- SECTION 1: Add tenant_id to blog_posts (was single-tenant, now multi-tenant)
-- SECTION 2: Replace blog_posts RLS with tenant-isolated policies
-- SECTION 3: Create media_items table with tenant-isolated RLS
--
-- Verification steps:
--   -- blog_posts tenant isolation:
--   SET ROLE authenticated; SELECT * FROM blog_posts; RESET ROLE;
--   SET ROLE anon; SELECT * FROM blog_posts WHERE is_published = true; RESET ROLE;
--   -- media_items:
--   SELECT * FROM media_items LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM media_items; RESET ROLE;
--   SET ROLE anon; SELECT * FROM media_items; RESET ROLE; -- should return 0 rows

-- ==========================================
-- SECTION 1: ALTER blog_posts — add tenant_id
-- ==========================================

-- Add nullable first to allow backfill
ALTER TABLE blog_posts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill existing rows with the Halo Efekt tenant
UPDATE blog_posts SET tenant_id = (SELECT id FROM tenants WHERE email = 'kontakt@haloefekt.pl');

-- Now enforce NOT NULL
ALTER TABLE blog_posts ALTER COLUMN tenant_id SET NOT NULL;

-- Index for tenant-scoped queries
CREATE INDEX idx_blog_posts_tenant ON blog_posts(tenant_id);

-- ==========================================
-- SECTION 2: blog_posts RLS — replace with tenant isolation
-- ==========================================

-- Drop existing authenticated policies (owner-based, single-tenant)
DROP POLICY "Authenticated users can view blog posts" ON blog_posts;
DROP POLICY "Owners can insert blog posts" ON blog_posts;
DROP POLICY "Owners can update blog posts" ON blog_posts;
DROP POLICY "Owners can delete blog posts" ON blog_posts;

-- KEEP: "Anyone can view published blog posts" (anon, is_published = true) — DO NOT TOUCH

-- New tenant-isolated policies using current_user_tenant_id() helper (SECURITY DEFINER, no recursion)
CREATE POLICY "Tenant users can view blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- ==========================================
-- SECTION 3: CREATE media_items table
-- ==========================================

CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'youtube', 'vimeo')),
  url TEXT NOT NULL,
  s3_key TEXT,
  thumbnail_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_media_items_tenant ON media_items(tenant_id);
CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_items_created ON media_items(created_at DESC);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- Tenant-isolated policies using current_user_tenant_id() helper (SECURITY DEFINER, no recursion)
CREATE POLICY "Tenant users can view media items"
  ON media_items FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert media items"
  ON media_items FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update media items"
  ON media_items FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete media items"
  ON media_items FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());
