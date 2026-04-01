-- Workflow Delay Step Fixes — AAA-T-150
-- 1. Add 'processing' to workflow_step_executions status CHECK
-- 2. Add claim_due_delay_steps() RPC for atomic delay step claiming
--
-- Verification steps:
--   INSERT INTO workflow_step_executions (..., status) VALUES (..., 'processing'); -- should pass
--   SELECT claim_due_delay_steps(10); -- should return empty set (no waiting rows)

-- ============================================================
-- FIX 1: Add 'processing' to workflow_step_executions status CHECK
-- ============================================================

ALTER TABLE workflow_step_executions
  DROP CONSTRAINT workflow_step_executions_status_check;

ALTER TABLE workflow_step_executions
  ADD CONSTRAINT workflow_step_executions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting', 'processing'));

-- ============================================================
-- FIX 2: RPC function for atomic delay step claiming
-- n8n cron calls this to atomically claim due delay steps
-- Uses FOR UPDATE SKIP LOCKED to prevent double-processing
-- ============================================================

CREATE OR REPLACE FUNCTION claim_due_delay_steps(p_limit INT DEFAULT 100)
RETURNS TABLE (id UUID, execution_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE workflow_step_executions
  SET status = 'processing'
  WHERE workflow_step_executions.id IN (
    SELECT wse.id
    FROM workflow_step_executions wse
    WHERE wse.status = 'waiting'
      AND wse.resume_at <= now()
    ORDER BY wse.resume_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING workflow_step_executions.id, workflow_step_executions.execution_id;
END;
$$;

-- Grant execute to authenticated role (service_role already has access via superuser perms)
GRANT EXECUTE ON FUNCTION claim_due_delay_steps(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_due_delay_steps(INT) TO service_role;
