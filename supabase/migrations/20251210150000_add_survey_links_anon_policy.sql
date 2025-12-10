-- Allow anonymous users to view survey_links table
-- This is required for the RLS policy on surveys table to work
-- (surveys policy references survey_links in subquery)
CREATE POLICY "Public can read survey links"
  ON survey_links FOR SELECT
  TO anon
  USING (true);

-- Verify the policy allows anon access to survey_links
-- Run in SQL editor: SET ROLE anon; SELECT * FROM survey_links;
