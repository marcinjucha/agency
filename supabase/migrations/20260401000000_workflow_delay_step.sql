-- Workflow Delay Step — AAA-T-150
-- Adds 'waiting' status to step executions, 'paused' status to executions,
-- resume_at column for delay polling, and partial index for efficient polling.
--
-- Verification steps:
--   INSERT INTO workflow_step_executions (execution_id, step_id, status) VALUES (..., ..., 'waiting'); -- should pass
--   INSERT INTO workflow_executions (workflow_id, tenant_id, status) VALUES (..., ..., 'paused'); -- should pass
--   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_wse_waiting_resume';
--   \d workflow_step_executions -- should show resume_at column

-- ============================================================
-- SECTION 1: Add resume_at column to workflow_step_executions
-- ============================================================

ALTER TABLE workflow_step_executions
  ADD COLUMN resume_at TIMESTAMPTZ;

-- ============================================================
-- SECTION 2: Extend workflow_step_executions status CHECK
-- Add 'waiting' for delay steps awaiting resume
-- ============================================================

ALTER TABLE workflow_step_executions
  DROP CONSTRAINT workflow_step_executions_status_check;

ALTER TABLE workflow_step_executions
  ADD CONSTRAINT workflow_step_executions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting'));

-- ============================================================
-- SECTION 3: Extend workflow_executions status CHECK
-- Add 'paused' for executions with active delay steps
-- ============================================================

ALTER TABLE workflow_executions
  DROP CONSTRAINT workflow_executions_status_check;

ALTER TABLE workflow_executions
  ADD CONSTRAINT workflow_executions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused'));

-- ============================================================
-- SECTION 4: Partial index for delay polling
-- n8n cron polls for waiting steps whose resume_at has passed
-- ============================================================

CREATE INDEX idx_wse_waiting_resume
  ON workflow_step_executions (resume_at)
  WHERE status = 'waiting';
