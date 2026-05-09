-- Booking-triggered workflow attachment per survey_link (AAA-T-63)
-- Adds a SECOND workflow attachment column alongside existing `workflow_id`.
-- Existing `workflow_id` stays semantically tied to `survey_submitted` trigger.
-- New `booking_workflow_id` ties to `booking_created` trigger (fired after calendar booking).
-- Each survey_link can independently fire workflow A on survey-submit AND workflow B on booking-created (or null on either side).

ALTER TABLE survey_links
  ADD COLUMN booking_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;

CREATE INDEX idx_survey_links_booking_workflow_id
  ON survey_links (booking_workflow_id)
  WHERE booking_workflow_id IS NOT NULL;

COMMENT ON COLUMN survey_links.booking_workflow_id IS
  'Workflow that fires on booking_created event for this link. trigger_type filter enforced in app layer (verifyWorkflowAccess).';

-- RLS: No changes needed.
-- Anon SELECT policy "Public can read survey links" uses USING(true),
-- which automatically covers the new column.
-- Authenticated policy uses tenant_id = current_user_tenant_id(),
-- which also covers the new column without modification.

-- Verification:
-- 1. supabase db reset
-- 2. SET ROLE anon; SELECT booking_workflow_id FROM survey_links LIMIT 1; RESET ROLE;
-- 3. pnpm db:types
-- 4. grep "booking_workflow_id" packages/database/src/types.ts
