-- Create blog_posts table for haloefekt.pl blog/content marketing
-- Single-tenant (no tenant_id) — shared marketing site, not per-tenant content
-- Tiptap ProseMirror JSON content with pre-rendered HTML for website SSR
-- Role-based access: only owner can INSERT/UPDATE/DELETE; any authenticated can SELECT
-- Anon can SELECT published posts + draft preview via preview_token
--
-- Verification steps:
--   SELECT * FROM blog_posts LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM blog_posts; RESET ROLE;
--   SET ROLE anon; SELECT * FROM blog_posts WHERE is_published = true; RESET ROLE;
--   SET ROLE anon; SELECT * FROM blog_posts WHERE is_published = false; RESET ROLE; -- should return 0 rows
--   SET ROLE anon; SELECT * FROM blog_posts WHERE preview_token = 'some-uuid'; RESET ROLE; -- should return draft
--   -- Role-based write tests:
--   SET ROLE authenticated; SET request.jwt.claims = '{"sub": "owner-user-uuid"}';
--   INSERT INTO blog_posts (slug, title) VALUES ('test', 'Test'); -- should succeed for owner
--   DELETE FROM blog_posts WHERE slug = 'test'; RESET ROLE;
--   SET ROLE authenticated; SET request.jwt.claims = '{"sub": "member-user-uuid"}';
--   INSERT INTO blog_posts (slug, title) VALUES ('test2', 'Test2'); -- should FAIL for member
--   RESET ROLE;

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  html_body TEXT,
  cover_image_url TEXT,
  category TEXT,
  author_name TEXT,
  seo_metadata JSONB,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  estimated_reading_time INTEGER,
  preview_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at DESC) WHERE is_published = true;
CREATE INDEX idx_blog_posts_category ON blog_posts(category) WHERE category IS NOT NULL;
CREATE INDEX idx_blog_posts_preview_token ON blog_posts(preview_token);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated CMS user can view all blog posts (drafts included for CMS)
CREATE POLICY "Authenticated users can view blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only owner can create blog posts
CREATE POLICY "Owners can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'owner');

-- UPDATE: only owner can update blog posts
CREATE POLICY "Owners can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

-- DELETE: only owner can delete blog posts
CREATE POLICY "Owners can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'owner');

-- SELECT: anon can read published blog posts (public website)
CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (is_published = true);

-- NOTE: Draft preview via preview_token uses service role client on the website
-- server side (bypasses RLS). The preview_token acts as UUID obscurity access
-- control — knowing the token IS the authorization. Same pattern as survey_links.
