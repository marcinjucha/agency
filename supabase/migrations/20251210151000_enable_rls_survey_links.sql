-- Enable RLS on survey_links table (was missing!)
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Public can read survey links" ON survey_links;
DROP POLICY IF EXISTS "Anyone can create responses" ON responses;

-- Add policy for anon users to read survey_links
CREATE POLICY "Public can read survey links"
  ON survey_links FOR SELECT
  TO anon
  USING (true);

-- Ensure responses table allows anon INSERT
CREATE POLICY "Anyone can create responses"
  ON responses FOR INSERT
  TO anon
  WITH CHECK (true);
