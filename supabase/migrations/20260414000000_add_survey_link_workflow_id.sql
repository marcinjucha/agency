-- Survey→Workflow binding (AAA-T-186)
-- Fixes all-workflows-fire bug: NULL workflow_id = no workflow fires on submission.
-- Existing survey_links without workflow_id continue working (backward compatible).

ALTER TABLE survey_links
  ADD COLUMN workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;

CREATE INDEX idx_survey_links_workflow_id
  ON survey_links (workflow_id)
  WHERE workflow_id IS NOT NULL;

COMMENT ON COLUMN survey_links.workflow_id IS
  'Optional workflow to trigger on survey submission. NULL = no workflow fires.';

-- RLS: No changes needed.
-- Anon SELECT policy "Public can read survey links" uses USING(true),
-- which automatically covers the new column.
-- Authenticated policy uses tenant_id = current_user_tenant_id(),
-- which also covers the new column without modification.

-- Verification:
-- 1. supabase db reset
-- 2. SET ROLE anon; SELECT workflow_id FROM survey_links LIMIT 1; RESET ROLE;
-- 3. npm run db:types
-- 4. grep "workflow_id" packages/database/src/types.ts
