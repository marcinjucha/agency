-- Add dry run flag to workflow executions
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS is_dry_run BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering out dry runs from execution list
CREATE INDEX IF NOT EXISTS idx_workflow_executions_is_dry_run
  ON workflow_executions (is_dry_run)
  WHERE is_dry_run = false;
