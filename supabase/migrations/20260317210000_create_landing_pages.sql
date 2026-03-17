-- Create landing_pages table for haloefekt.pl marketing page CMS
-- Single-tenant (no tenant_id) — shared marketing site, not per-tenant content
-- Block-based content editing with SEO metadata and publishing workflow
-- Role-based access: only owner can INSERT/UPDATE/DELETE; any authenticated can SELECT
--
-- Verification steps:
--   SELECT * FROM landing_pages LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM landing_pages; RESET ROLE;
--   SET ROLE anon; SELECT * FROM landing_pages WHERE is_published = true; RESET ROLE;
--   SET ROLE anon; SELECT * FROM landing_pages WHERE is_published = false; RESET ROLE; -- should return 0 rows
--   -- Role-based write tests:
--   SET ROLE authenticated; SET request.jwt.claims = '{"sub": "owner-user-uuid"}';
--   INSERT INTO landing_pages (slug, title) VALUES ('test', 'Test'); -- should succeed for owner
--   DELETE FROM landing_pages WHERE slug = 'test'; RESET ROLE;
--   SET ROLE authenticated; SET request.jwt.claims = '{"sub": "member-user-uuid"}';
--   INSERT INTO landing_pages (slug, title) VALUES ('test2', 'Test2'); -- should FAIL for member
--   RESET ROLE;

CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE DEFAULT 'home',
  title TEXT NOT NULL DEFAULT 'Landing Page',
  blocks JSONB NOT NULL DEFAULT '[]',
  seo_metadata JSONB,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_published ON landing_pages(is_published) WHERE is_published = true;

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- HELPER FUNCTION FOR ROLE-BASED RLS
-- ==========================================

-- Returns current user's role from users table.
-- SECURITY DEFINER bypasses RLS on users table — avoids infinite recursion.
-- Same pattern as current_user_tenant_id() from initial schema.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

COMMENT ON FUNCTION public.current_user_role() IS
  'Returns the role for the current authenticated user. Used in RLS policies for role-based access control. SECURITY DEFINER bypasses RLS on users table to prevent infinite recursion.';

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated CMS user can view all landing pages (for CMS preview)
CREATE POLICY "Authenticated users can view landing pages"
  ON landing_pages FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only owner can create landing pages
CREATE POLICY "Owners can insert landing pages"
  ON landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'owner');

-- UPDATE: only owner can update landing pages
CREATE POLICY "Owners can update landing pages"
  ON landing_pages FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

-- DELETE: only owner can delete landing pages
CREATE POLICY "Owners can delete landing pages"
  ON landing_pages FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'owner');

-- SELECT: anon can read published landing pages only (public website)
CREATE POLICY "Anyone can view published landing pages"
  ON landing_pages FOR SELECT
  TO anon
  USING (is_published = true);

-- Seed default home page
INSERT INTO landing_pages (slug, title, is_published)
VALUES ('home', 'Halo Efekt - Landing Page', false)
ON CONFLICT DO NOTHING;
