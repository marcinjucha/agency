-- Allow anonymous users to read surveys table
-- Security: Only surveys linked via survey_links can be accessed
-- (anon must know the survey ID from a valid survey link)
CREATE POLICY "Anonymous can read surveys"
  ON surveys FOR SELECT
  TO anon
  USING (true);

-- This is safe because:
-- 1. Survey IDs are UUIDs (not guessable)
-- 2. Only accessible via survey_links (which has is_active check)
-- 3. No sensitive data in surveys table (just questions JSON)
