-- Reduce landing_pages to a single configurable CTA URL.
--
-- WHY: Post-pivot, the landing page CONTENT (hero, blocks, title, SEO, publish
-- workflow) is moving into hardcoded app code (DEFAULT_BLOCKS). The only value
-- that must stay dynamic / editable in the CMS is the survey link URL wired
-- under the landing CTAs. So the table collapses from a block-based content
-- store to a thin "where do the landing CTAs point?" config holder.
--
-- Changes:
--   1. Add cta_url TEXT (defensive — column may already exist in a shared local DB).
--   2. Backfill cta_url with the survey link currently hardcoded in DEFAULT_BLOCKS.
--   3. Drop the now-unused content columns (blocks, seo_metadata, is_published, title).
--   4. Replace the anon SELECT RLS policy: it previously filtered on is_published
--      (being dropped). New policy lets anon read all rows — the table now holds
--      only a public CTA URL, no sensitive data (same posture as site_settings,
--      which already allows anon SELECT USING (true)). Authenticated/owner
--      write policies are unaffected (they do not reference is_published).
--
-- Verification:
--   SELECT id, slug, cta_url FROM landing_pages;
--   -- anon can now read the CTA URL (no is_published filter):
--   SET ROLE anon; SELECT slug, cta_url FROM landing_pages; RESET ROLE;
--   -- owner write still works, member still blocked:
--   SET ROLE authenticated; SET request.jwt.claims = '{"sub": "owner-user-uuid"}';
--   UPDATE landing_pages SET cta_url = '/survey/test' WHERE slug = 'home'; RESET ROLE;

-- 1. Add the configurable CTA URL column (defensive — may already exist locally).
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_url TEXT;

-- 2. Backfill with the survey link currently hardcoded in the app's DEFAULT_BLOCKS.
UPDATE landing_pages
SET cta_url = '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4'
WHERE cta_url IS NULL;

-- 3. Replace the anon SELECT policy BEFORE dropping is_published (it references it).
DROP POLICY IF EXISTS "Anyone can view published landing pages" ON landing_pages;

-- New anon SELECT: table holds only a public CTA URL, no sensitive data.
CREATE POLICY "Anyone can view landing pages"
  ON landing_pages FOR SELECT
  TO anon
  USING (true);

-- 4. Drop the partial index on is_published before dropping the column it references.
DROP INDEX IF EXISTS idx_landing_pages_published;

-- 5. Drop the now-unused content columns (defensive).
ALTER TABLE landing_pages DROP COLUMN IF EXISTS blocks;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS seo_metadata;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS is_published;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS title;
