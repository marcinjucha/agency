-- Migration: 20251210143628_add_public_survey_access.sql
-- Purpose: Enable public access to surveys via survey_links for Phase 2 Client Survey Form
-- Affected: surveys table, survey_links table
-- Context: Website app (apps/website) needs to allow unauthenticated users to view surveys

-- ==========================================
-- 1. ADD is_active COLUMN TO survey_links
-- ==========================================

-- Add is_active column to survey_links for enabling/disabling links
ALTER TABLE survey_links
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN survey_links.is_active IS 'Whether this survey link is active. Inactive links cannot be accessed by public users.';

-- Create index for performance (frequent filtering by is_active)
CREATE INDEX idx_survey_links_is_active ON survey_links(is_active);

-- ==========================================
-- 2. RLS POLICY: PUBLIC SURVEY ACCESS
-- ==========================================

-- Allow anonymous users to view surveys that have active links
-- This enables the client survey form to fetch survey data
-- Security: Only surveys with active links are exposed
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT survey_id
      FROM survey_links
      WHERE is_active = true
    )
  );

COMMENT ON POLICY "Public can view surveys via active links" ON surveys IS
  'Allows anonymous users to view surveys that have at least one active link. This is safe because it only exposes surveys that lawyers explicitly chose to share via survey_links.';

-- ==========================================
-- 3. HELPER FUNCTION: ATOMIC COUNTER
-- ==========================================

-- Create function to atomically increment submission count
-- This prevents race conditions when multiple clients submit simultaneously
-- SECURITY DEFINER is safe here because it only updates survey_links table
CREATE OR REPLACE FUNCTION increment_submission_count(link_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE survey_links
  SET submission_count = submission_count + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO authenticated;

COMMENT ON FUNCTION increment_submission_count(UUID) IS
  'Atomically increments the submission_count for a survey link. Used by client survey form after successful submission. SECURITY DEFINER is safe because it only updates survey_links.';

-- ==========================================
-- VERIFICATION STEPS
-- ==========================================

-- After applying this migration:
--
-- 1. Apply migration:
--    npx supabase db push
--
-- 2. Regenerate TypeScript types:
--    npm run db:types
--
-- 3. Test RLS policy in Supabase SQL Editor:
--    SET ROLE anon;
--    SELECT * FROM surveys WHERE id IN (
--      SELECT survey_id FROM survey_links WHERE is_active = true
--    );
--    -- Should return surveys with active links
--
-- 4. Test inactive link filtering:
--    UPDATE survey_links SET is_active = false WHERE id = '[test-link-id]';
--    SET ROLE anon;
--    SELECT * FROM surveys WHERE id = '[survey-id]';
--    -- Should return no rows if survey has no other active links
--
-- 5. Test increment function:
--    SELECT increment_submission_count('[link-id]');
--    SELECT submission_count FROM survey_links WHERE id = '[link-id]';
--    -- submission_count should be incremented by 1
--
-- 6. Verify policy in Supabase Dashboard:
--    Authentication → Policies → surveys table
--    -- Should show "Public can view surveys via active links" policy
--
-- Expected behavior:
-- - Anonymous users can SELECT surveys that have is_active = true links
-- - Anonymous users can call increment_submission_count()
-- - Surveys without active links are NOT accessible to anon users
-- - Existing authenticated user policies remain unchanged
