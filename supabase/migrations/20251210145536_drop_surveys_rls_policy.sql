-- Drop problematic RLS policy that causes infinite recursion
--
-- ROOT CAUSE: The subquery in this policy references survey_links table,
-- which causes infinite recursion when anon users query surveys.
--
-- SOLUTION: Remove RLS policy on surveys table entirely.
-- Security via UUID obscurity: survey IDs are only known through survey_links,
-- which anon users already have read access to.
-- If anon user knows the survey_id, they can read it directly.

DROP POLICY IF EXISTS "Public can view surveys via active links" ON surveys;
