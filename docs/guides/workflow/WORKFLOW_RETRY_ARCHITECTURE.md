# Workflow Retry Architecture

Status: **Proposed** (2026-04-21) — not yet implemented. Supersedes nothing; extends `WORKFLOW_ENGINE.md`.

## Purpose

Design for resumable workflow executions: when a step fails, the user (or system) can retry from the failed step without re-executing already-completed steps, especially those with client-visible side effects (emails, external webhooks, paid AI calls).

## Core Decision

**Continuation-with-attempts** (not Fork). One `workflow_executions` row per business unit of work; retries append new `workflow_step_executions` rows scoped by `attempt_number`. UI may still present attempts as a "fork-like" timeline — it's a rendering choice, not a data model choice.

### Why Continuation over Fork

| Criterion | Continuation | Fork |
|---|---|---|
| MVP code complexity | 1 new column (`attempt_number`) + replay guard | 2 new columns (`parent_execution_id`, `root_execution_id`) + recursive audit queries |
| "One business job" semantics | Natural | Requires walking the tree |
| Auto-retry policies later (3× with backoff) | Natural home | Each attempt = new execution, harder to express as "same job" |
| Audit for multiple retry attempts | New `workflow_step_executions` row per attempt — full history | Same — via parent chain |
| Migration path to Fork if needed later | `parent_execution_id` column addable; legacy rows default to `root_execution_id = id` | Harder to merge a tree back into attempts |

Fork's one advantage (naturally isolating workflow-definition changes between retries) is neutralized by per-execution workflow snapshot (see Edge Case 1 below).

## Replay Mechanism

Source of truth for "this step is already done" is **the status column in `workflow_step_executions`**, not step-type metadata or idempotency flags. Any step with `status IN ('completed', 'skipped')` in the latest attempt is replay-skipped — output is taken from DB, passed through to next step's `variableContext`. Works identically for every step type (send_email, ai_action, condition, webhook, delay, save_to_response).

### n8n Orchestrator changes

In `Workflow Process Step` subworkflow, `Prepare Current Step` gains a **replay guard** (runs after the existing `failed`/`skippedStepIds` guards):

```text
1. Query workflow_step_executions for (execution_id, step_id) ORDER BY attempt_number DESC LIMIT 1
2. If prev.status === 'completed':
     stepType = '__replay__'
     stepResult = { success: true, outputPayload: prev.output_payload, alreadyPersisted: true }
     → goes through Skip Step path → Process Step Result merges outputPayload into variableContext
3. If prev.status === 'skipped':
     stepType = '__replay_skipped__'
     stepResult = { success: true, outputPayload: {}, alreadyPersisted: true }
4. If prev.status IN ('failed', 'pending', 'running') OR prev === null:
     INSERT new workflow_step_executions row with attempt_number = (prev?.attempt_number ?? 0) + 1
     Continue normal execution
```

### CMS retry endpoint (MVP: admin only)

```
POST /api/workflows/retry { executionId }

1. Validate execution.status IN ('failed', 'running-stuck')
2. UPDATE workflow_executions SET status='running', completed_at=NULL, error_message=NULL
   WHERE id = :executionId
3. POST to n8n Orchestrator webhook with { executionId, workflowId, triggerPayload }
   (triggerPayload comes from workflow_executions.trigger_payload — no new trigger firing)
4. Orchestrator starts from step 0; replay guard skips completed steps.
```

User-facing retry (policies, auto-retry with backoff) is deferred to a later iteration, but the architecture supports it without rework — a cron job that flips `status='failed'` → `status='pending'` and re-dispatches is all that's needed.

---

## Edge Cases & Decisions

### Edge Case 1 — Workflow definition changes between first run and retry

**Scenario:** User edits `step_config` of step #5 (e.g., changes email template) between the failed execution and clicking "Retry". Step #3's cached `output_payload` was built from old variables. Step #5 now reads the new template but gets old `variableContext`.

**Decision:** Per-execution **workflow snapshot**.

**Implementation:**
- New column `workflow_executions.workflow_snapshot JSONB` — full workflow definition at the time of execution start.
- New column `workflow_step_executions.step_config_snapshot JSONB` — step config at the time this attempt ran.
- Retry uses the snapshot, NOT the current live workflow definition.
- Editing a workflow after execution start has zero effect on active/failed executions.

**Consequence:** "Edit workflow and rerun with new logic" is a DIFFERENT user intent — exposed as "Start fresh execution" (new trigger firing, new `workflow_executions` row, current definition used). Two buttons in UI, two intents.

### Edge Case 2 — Audit trail across multiple retry attempts

**Scenario:** Execution fails, retry fails, second retry fails, third retry succeeds. User needs to see: "there were 3 attempts, each with its own error".

**Decision:** Never overwrite; append new `workflow_step_executions` row per attempt.

**Implementation:**
- New column `workflow_step_executions.attempt_number INT NOT NULL DEFAULT 1`.
- Unique constraint: `(execution_id, step_id, attempt_number)`.
- Replay guard queries `ORDER BY attempt_number DESC LIMIT 1` to find latest attempt's status.
- UI history shows per-step attempt timeline.

**Consequence:** `workflow_step_executions` grows faster than before (was 1 row per step per execution; now 1 row per step PER ATTEMPT). Acceptable — retries are rare operationally; data volume not a concern short-term.

### Edge Case 3 — Status semantics for non-executed steps

**Scenario:** Workflow has 10 steps. Step 3 fails. Steps 4-10 never run. What's their status?

**Old behavior (BUG):** Step 4-10 stay at `status='running'` (set by "Mark Step Running") forever — Process Step's failed-passthrough returns item without `dbStatus`, so "Update Step Execution" never fires.

**Decision:** Four-status semantics with precise meaning:

| Status | Meaning | Transitions |
|---|---|---|
| `pending` | Created, not yet started this attempt | → `running` (step starts) OR → `cancelled` (earlier step failed) |
| `running` | Handler is executing this step right now | → `completed` OR → `failed` |
| `completed` | Handler succeeded; `output_payload` is valid | Terminal for this attempt |
| `failed` | Handler returned `success: false`; `error_message` is set | Terminal for this attempt; eligible for retry |
| `skipped` | Condition step routed around it (branch not taken) | Terminal; replay respects this |
| `cancelled` | Not executed because an earlier step in the same execution failed | Terminal; replay ignores (treats as "will re-attempt if retry happens") |

**Implementation:** Process Step's failed-passthrough path must now mark every remaining step as `cancelled` (not leave them as `running`). This is done by Orchestrator at the point of detecting `item.failed`, with a batch PATCH on all `workflow_step_executions` for this execution where `status IN ('pending', 'running')` AND `step_id != currentFailedStepId`.

### Edge Case 4 — Stuck `running` rows from the old bug

**Scenario:** Existing database has `workflow_step_executions` rows stuck at `status='running'` from before the bugfix (screenshot in session shows 5-day-old row).

**Decision:** One-shot cleanup migration.

**Implementation:**
```sql
UPDATE workflow_step_executions
SET status = 'cancelled',
    completed_at = NOW(),
    error_message = 'Cancelled during architecture cleanup (stuck running)'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';

UPDATE workflow_executions
SET status = 'failed',
    completed_at = NOW(),
    error_message = 'Cancelled during architecture cleanup (stuck running)'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

Runs once in the migration that introduces `attempt_number` / `workflow_snapshot`.

### Edge Case 5 — Workflow deleted while execution is active

**Scenario:** User deletes a workflow (hard delete or soft delete) while one of its executions is in progress or failed.

**Decision:** Workflow snapshot decouples history from live definitions. Deleted workflows don't break history rendering — `workflow_executions.workflow_snapshot` is self-contained.

**Implementation:** No schema change beyond Edge Case 1's snapshot. CMS history queries prefer snapshot over `workflows.name` when rendering. `workflows` table FK remains `ON DELETE SET NULL` (or similar); snapshot is source of truth for historical display.

### Edge Case 6 — Concurrent retry (double-click on "Retry" button)

**Scenario:** Admin clicks Retry twice in 200ms. Two Orchestrator invocations start concurrently for the same executionId.

**Decision:** Optimistic lock via status transition.

**Implementation:**
```sql
UPDATE workflow_executions
SET status = 'running', ...
WHERE id = :executionId
  AND status = 'failed'     -- only transitions FROM failed
RETURNING id;
```

If `RETURNING` returns 0 rows, the retry is already in progress — CMS responds with 409 Conflict. No race.

### Edge Case 7 — Retry of a step whose handler has changed server-side

**Scenario:** AI Action handler in n8n is edited (e.g., bug fix in JSON parsing). Old executions retried after the fix get the NEW handler behavior. Workflow snapshot doesn't cover this — snapshot is per-workflow config, not per-handler code.

**Decision:** Accept. Handlers are infrastructure; improvements apply to all retries. Handler versioning is out of scope for this architecture.

**Consequence:** If a handler bug is fixed, retrying old failed executions is typically what the user WANTS (the retry benefits from the fix). If a handler behavior change is breaking, admin is responsible for not mass-retrying.

### Edge Case 8 — Replay of `send_email` that was mid-send when worker crashed

**Scenario:** n8n worker dies between "email sent to Resend API" and "write `completed` to DB". On retry, replay guard sees `status='running'` (not `completed`), tries to send again.

**Decision:** Accept for MVP. Same risk exists in all workflow engines without distributed transactions. Mitigations for later:
- Resend provides idempotency keys — handler could pass one derived from `(execution_id, step_id, attempt_number)`.
- Webhook step type similarly needs idempotency key support when we add user-facing retry.

**For MVP:** document the risk; don't auto-retry `running` older than some threshold (manual admin decision).

### Edge Case 9 — `variableContext` lost when execution spans many retries across long time windows

**Scenario:** Retry executed 3 weeks after the failed execution. `$getWorkflowStaticData('global')` was cleared (stale entry cleanup at 2-hour window in Process Step). Fresh execution means `execState` must be rebuilt.

**Decision:** Already handled by replay mechanism. On retry, Prepare Current Step iterates from step 0. For each step with `status='completed'`, Process Step Result merges its `output_payload` into `execState.variableContext`. By the time the retry reaches the first non-completed step, `variableContext` is fully reconstructed from DB. No staticData persistence needed.

**Consequence:** Retry after arbitrary time window works. Only requirement: `workflow_step_executions.output_payload` is preserved (which it is — we never overwrite, only append new attempts).

---

## Schema Changes Summary

```sql
-- workflow_executions
ALTER TABLE workflow_executions
  ADD COLUMN workflow_snapshot JSONB;

-- workflow_step_executions
ALTER TABLE workflow_step_executions
  ADD COLUMN attempt_number INT NOT NULL DEFAULT 1,
  ADD COLUMN step_config_snapshot JSONB;

ALTER TABLE workflow_step_executions
  DROP CONSTRAINT workflow_step_executions_execution_id_step_id_key,  -- if exists
  ADD CONSTRAINT workflow_step_executions_attempt_unique
    UNIQUE (execution_id, step_id, attempt_number);

-- Status enum extension (check constraint or enum type)
ALTER TABLE workflow_step_executions
  DROP CONSTRAINT workflow_step_executions_status_check,
  ADD CONSTRAINT workflow_step_executions_status_check
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled'));

-- Index for replay guard
CREATE INDEX idx_wse_replay_lookup
  ON workflow_step_executions (execution_id, step_id, attempt_number DESC);
```

## UI Implications (for future iterations)

- **History view per execution**: show steps as a timeline. Each step expands to show attempts (if >1). "Fork-like" visual option: render attempts as branched nodes with shared parent.
- **Retry button**: visible in failed execution detail view. Confirmation dialog warns "This will re-run from failed step — completed steps will be replayed with cached output".
- **Workflow graph mode**: long-term, history should render as the workflow graph with per-node status overlay (same visualization as the editor). Makes "what happened" intuitive at a glance. Blocked on current rendering being list-based.

## Related

- `WORKFLOW_ENGINE.md` — current execution model, state management, data flow
- `ag-n8n-step-handlers` skill — handler contract, step handlers pattern
- `ag-workflow-engine` skill — workflow engine architecture, orchestrator patterns
