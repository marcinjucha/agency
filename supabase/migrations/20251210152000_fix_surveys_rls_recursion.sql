-- Remove the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Public can view surveys via active links" ON surveys;

-- Surveys table should NOT have a blanket policy for anon users
-- The only way anon can access surveys is through the link
-- Security by obscurity: survey IDs are only known via survey_links
-- No RLS policy needed - anon can read any survey IF they know the ID

-- Verify survey_links is accessible to anon
-- Policy already exists from previous migration:
-- "Public can read survey links" ON survey_links FOR SELECT TO anon
