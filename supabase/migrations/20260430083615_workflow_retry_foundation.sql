-- Workflow Retry Foundation — AAA-T-208 + AAA-T-209
--
-- Combined migration covering:
--   T-208: P0 cleanup of stuck running rows (failed-passthrough persistence bug)
--   T-209: Schema foundation for retry — Continuation-with-attempts model
--
-- Architecture decisions (see SESSION.md + docs/guides/workflow/WORKFLOW_RETRY_ARCHITECTURE.md):
--   1. Eager workflow_snapshot per execution — workflow edits don't affect in-flight runs
--   2. attempt_number per step execution — replay creates new attempt rows, never overwrites
--   3. Eager input_payload per attempt — handlers persist rendered payload BEFORE external call,
--      so retry reuses the same payload (resilient to template/prompt edits)
--   4. status='cancelled' added to step executions — completes the lifecycle for retry/cancel UI
--   5. UNIQUE(execution_id, step_id, attempt_number) — replaces implicit one-row-per-step model
--
-- Operations (in order — kolejność krytyczna):
--   1. ADD workflow_executions.workflow_snapshot (DEFAULT first, NOT NULL safe on existing rows)
--   2. ADD workflow_step_executions.attempt_number (DEFAULT 1)
--   3. Backfill workflow_step_executions.input_payload NULL → '{}'::jsonb
--   4. SET NOT NULL + DEFAULT on input_payload
--   5. Replace status CHECK to add 'cancelled' (preserve existing: pending, running, completed,
--      failed, skipped, waiting, processing)
--   6. Cleanup stuck rows (T-208): step_executions running >1h → cancelled
--   7. Cleanup stuck rows (T-208): workflow_executions running >1h → failed
--   8. DROP IF EXISTS old unique on (execution_id, step_id) — never existed in initial schema
--      but defensive in case of manual constraint creation
--   9. ADD UNIQUE(execution_id, step_id, attempt_number)
--   10. CREATE INDEX for replay lookup (execution_id, step_id, attempt_number DESC)
--
-- Verification steps (run after `supabase db push`):
--   \d workflow_executions       -- should show workflow_snapshot JSONB NOT NULL DEFAULT
--   \d workflow_step_executions  -- should show attempt_number INT NOT NULL, input_payload NOT NULL
--   SELECT conname, pg_get_constraintdef(oid)
--     FROM pg_constraint
--     WHERE conrelid = 'workflow_step_executions'::regclass;
--   -- Should list: workflow_step_executions_status_check (with 'cancelled')
--   --              workflow_step_executions_attempt_unique
--   SELECT COUNT(*) FROM workflow_step_executions WHERE status='running' AND started_at < NOW() - INTERVAL '1 hour';
--   -- Should be 0 (cleaned up)

-- ============================================================
-- SECTION 1: Add workflow_snapshot to workflow_executions (T-209)
-- ============================================================

ALTER TABLE workflow_executions
  ADD COLUMN workflow_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN workflow_executions.workflow_snapshot IS
  'AAA-T-209: Frozen copy of workflow definition (steps + edges + step_config) at execution start. '
  'Populated by Orchestrator Fetch and Initialize. Decouples in-flight runs from live workflow edits — '
  'editing a workflow does NOT affect already-running executions. Replay/retry replays against this snapshot, '
  'not the current workflow. Shape: { steps: [{id, slug, step_type, step_config, position}], edges: [...] }.';

-- ============================================================
-- SECTION 2: Add attempt_number to workflow_step_executions (T-209)
-- ============================================================

ALTER TABLE workflow_step_executions
  ADD COLUMN attempt_number INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN workflow_step_executions.attempt_number IS
  'AAA-T-209: Retry attempt counter. First execution = 1. Replay guard increments on retry of failed/pending/running steps. '
  'Combined with execution_id + step_id forms unique key. Replay logic: latest attempt by (execution_id, step_id) '
  'with status=completed/skipped → reuse output_payload via __replay__ virtual step; status=failed/pending/running → '
  'INSERT new row with attempt_number+1.';

-- ============================================================
-- SECTION 3: Backfill input_payload NULLs before SET NOT NULL (T-209)
-- ============================================================

-- WHY guard with WHERE input_payload IS NULL: do NOT overwrite existing values
UPDATE workflow_step_executions
  SET input_payload = '{}'::jsonb
  WHERE input_payload IS NULL;

-- ============================================================
-- SECTION 4: Promote input_payload to NOT NULL with default (T-209)
-- ============================================================

ALTER TABLE workflow_step_executions
  ALTER COLUMN input_payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN input_payload SET NOT NULL;

COMMENT ON COLUMN workflow_step_executions.input_payload IS
  'AAA-T-209: Rendered ready-to-execute payload persisted by handler BEFORE external call (separate PATCH from Mark Step Running). '
  'Includes resolved variableContext, rendered email HTML, resolved AI prompt, etc. Retry reuses this payload — '
  'resilient to mid-flight edits of email_templates, AI prompts, or variableContext sources. '
  'Was nullable JSONB pre-T-209; backfilled to ''{}'' for legacy rows.';

-- ============================================================
-- SECTION 5: Extend status CHECK to include 'cancelled' (T-209)
-- Preserves all existing values: pending, running, completed, failed, skipped, waiting, processing
-- (set established by 20260401065916_workflow_delay_step_fixes.sql)
-- ============================================================

ALTER TABLE workflow_step_executions
  DROP CONSTRAINT workflow_step_executions_status_check;

ALTER TABLE workflow_step_executions
  ADD CONSTRAINT workflow_step_executions_status_check
  CHECK (status IN (
    'pending',
    'running',
    'completed',
    'failed',
    'skipped',
    'waiting',
    'processing',
    'cancelled'
  ));

COMMENT ON CONSTRAINT workflow_step_executions_status_check ON workflow_step_executions IS
  'AAA-T-209: Step execution lifecycle. Added ''cancelled'' for retry/abort flows. '
  'Existing values preserved (waiting/processing from delay step machinery, AAA-T-150).';

-- ============================================================
-- SECTION 6: T-208 cleanup — stuck running step_executions
-- ============================================================
-- Failed-passthrough bug (memory.md 2026-04-21): when execState.failed=true, remaining steps went
-- through a path that returned items WITHOUT dbStatus → Update Step Execution never fired →
-- rows stuck at status='running' indefinitely. Cleanup before adding UNIQUE constraint so we don't
-- trip on stale duplicates.

UPDATE workflow_step_executions
  SET status = 'cancelled',
      completed_at = NOW(),
      error_message = 'Auto-cleanup: stuck running > 1h (AAA-T-208 failed-passthrough fix)'
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '1 hour';

-- ============================================================
-- SECTION 7: T-208 cleanup — stuck running workflow_executions
-- ============================================================

UPDATE workflow_executions
  SET status = 'failed',
      completed_at = NOW(),
      error_message = 'Auto-cleanup: stuck running > 1h (AAA-T-208 failed-passthrough fix)'
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '1 hour';

-- ============================================================
-- SECTION 8: Drop legacy unique on (execution_id, step_id) if present (T-209)
-- ============================================================
-- Initial schema (20260331000000) did NOT define UNIQUE(execution_id, step_id), but defensively
-- DROP IF EXISTS in case any environment had it added manually. The retry model breaks single-row-
-- per-step assumption — multiple attempts per step is the new normal.

ALTER TABLE workflow_step_executions
  DROP CONSTRAINT IF EXISTS workflow_step_executions_execution_id_step_id_key;

-- ============================================================
-- SECTION 9: Add UNIQUE per attempt (T-209)
-- ============================================================
-- (execution_id, step_id, attempt_number) is the new identity per step execution. With backfilled
-- attempt_number=1 for all legacy rows and no historical duplicates per (execution_id, step_id) in
-- the existing schema, this constraint is safe to add.

ALTER TABLE workflow_step_executions
  ADD CONSTRAINT workflow_step_executions_attempt_unique
  UNIQUE (execution_id, step_id, attempt_number);

COMMENT ON CONSTRAINT workflow_step_executions_attempt_unique ON workflow_step_executions IS
  'AAA-T-209: Identity per attempt. Replay creates new row with attempt_number+1 for failed/pending/running '
  'rather than overwriting. Combined with idx_wse_replay_lookup, drives the replay guard query in '
  'Prepare Current Step (latest attempt per step).';

-- ============================================================
-- SECTION 10: Index for replay lookup (T-209)
-- ============================================================
-- Replay guard reads "latest attempt for this step" — DESC on attempt_number + LIMIT 1 makes this
-- a single index seek per step in Prepare Current Step.

CREATE INDEX idx_wse_replay_lookup
  ON workflow_step_executions (execution_id, step_id, attempt_number DESC);

COMMENT ON INDEX idx_wse_replay_lookup IS
  'AAA-T-209: Drives replay guard in Prepare Current Step. Query: '
  'SELECT * FROM workflow_step_executions WHERE execution_id=$1 AND step_id=$2 ORDER BY attempt_number DESC LIMIT 1. '
  'Used to decide reuse cached output (completed/skipped) vs new attempt (failed/pending/running).';
