# Workflow Engine Migration: n8n as Orchestrator

## Context

The workflow engine currently splits execution responsibility between CMS (Vercel, 10s timeout on Hobby plan) and n8n. CMS orchestrates the full workflow via `engine/executor.ts` (874 LOC), dispatching async steps to n8n and receiving callbacks. This architecture has three problems:

1. **Timeout risk** -- CMS orchestration can exceed 10s Vercel limit with multi-step workflows
2. **Complexity** -- 1663 LOC of execution code in CMS that belongs in an orchestrator (n8n)
3. **Delay polling** -- Delay steps use cron-based polling (5min granularity) instead of native Wait node

### Target Architecture

- **CMS = brain** (UI, config, monitoring, dry-run/test mode)
- **n8n = hands** (execution, orchestration, all side effects)

---

## File Inventory

### Files to DELETE from CMS (~1663 LOC)

| File | LOC | Responsibility |
|------|-----|----------------|
| `features/workflows/engine/executor.ts` | 874 | Full workflow orchestration, step loop, resume, status tracking |
| `features/workflows/engine/action-handlers.ts` | 338 | dispatchToN8n, handleDelay, handleWebhook, dryRunHandlers |
| `features/workflows/engine/trigger-matcher.ts` | 30 | findMatchingWorkflows (SELECT query) |
| `app/api/workflows/callback/route.ts` | 142 | Callback from n8n after async step completion |
| `app/api/workflows/resume/route.ts` | 142 | Resume paused execution after delay |
| `app/api/workflows/process-due-delays/route.ts` | 137 | Batch process delay steps (n8n cron target) |

### Files to KEEP in CMS (unchanged)

| File | LOC | Why keep |
|------|-----|----------|
| `engine/types.ts` | 119 | Shared types (TriggerPayload, ExecutionContext, ActionResult) -- used by UI + test mode |
| `engine/utils.ts` | ~200 | topologicalSort, buildTriggerContext, resolveVariables -- used by canvas UI + variable inserter |
| `engine/condition-evaluator.ts` | ~80 | evaluateCondition -- used by dry-run test mode in CMS |

### Files to SIMPLIFY in CMS

| File | Change |
|------|--------|
| `features/workflows/actions.ts` | Remove `dryRunWorkflow` that calls `executeWorkflow`. Keep `dryRunSingleStep` using mock handlers |
| `app/api/workflows/trigger/route.ts` | Simplify to ~40 LOC: validate -> POST to n8n Orchestrator -> 202 |

### Tests to DELETE (~1978 LOC)

| File | LOC | Reason |
|------|-----|--------|
| `engine/__tests__/executor.test.ts` | 713 | Tests the executor being deleted |
| `engine/__tests__/action-handlers.test.ts` | 574 | Tests real handlers being deleted (dryRunHandlers stay, see iteration 5) |
| `engine/__tests__/trigger-matcher.test.ts` | 88 | Logic moves to n8n |

### Tests to KEEP

| File | LOC | Why |
|------|-----|-----|
| `engine/__tests__/condition-evaluator.test.ts` | 145 | Condition evaluator stays for dry-run |
| `engine/__tests__/utils.test.ts` | 458 | Utils (topoSort, resolveVars) stay for UI |

### n8n Workflows to CREATE

| Workflow | Purpose |
|----------|---------|
| **Workflow Orchestrator** | Generic orchestrator: receives workflowId + triggerPayload, fetches definition from Supabase, topoSorts, loops steps, routes to subworkflows, handles conditions + delays natively |
| **Step: Condition Evaluator** | Code node implementing condition evaluation (port from CMS `condition-evaluator.ts`) |

### n8n Workflows to DELETE

| Workflow | Replacement |
|----------|-------------|
| **Workflow Action Executor** | Replaced by Workflow Orchestrator + per-step subworkflows |
| **Workflow Delay Processor** | Replaced by native n8n Wait node in Orchestrator |

### Existing n8n Subworkflows to REUSE (no changes)

| Workflow | Used for |
|----------|----------|
| **Send Email** | `send_email` step type |
| **MiniMax Agent** | `ai_action` step type |
| **Sentry Init** | Error tracking init |

### Supabase Changes

| Change | Action |
|--------|--------|
| `claim_due_delay_steps()` RPC | Can be removed after cutover (delay handled by n8n Wait node) |
| Schema | No changes needed -- same tables, same execution tracking columns |

---

## Iteration Plan

### Dependency Graph

```
1 → 2 → 3 → 4 → [5 + 6] → 7
```

- Iterations 1-4 are sequential (each builds on the previous)
- Iterations 5 and 6 are parallel (independent cleanup concerns)
- Iteration 7 is the final cutover that depends on both 5 and 6

---

### Iteration 1: n8n Workflow Orchestrator -- Core Loop (L)

**Goal:** Build the n8n Workflow Orchestrator that can execute a simple linear workflow (no conditions, no delays).

**Depends on:** nothing

**Deliverables:**
- [ ] New n8n workflow "Workflow Orchestrator" with webhook trigger
- [ ] Code node: fetch workflow definition + steps + edges from Supabase
- [ ] Code node: topological sort of steps (port logic from `engine/utils.ts`)
- [ ] Code node: sequential step loop with subworkflow dispatch per step type
- [ ] Send Email subworkflow integration (reuse existing)
- [ ] MiniMax Agent subworkflow integration (reuse existing)
- [ ] Code node: create `workflow_executions` record (status=running) at start
- [ ] Code node: create `workflow_step_executions` records (status=pending) at start
- [ ] Code node: update step execution status (running -> completed/failed) after each step
- [ ] Code node: update execution status (completed/failed) at end
- [ ] Sentry Init subworkflow at start
- [ ] Webhook responds with `{ executionId }` after starting (not after completion)
- [ ] Export workflow JSON to `n8n-workflows/workflows/Workflow Orchestrator.json`

**Verification:**
- Manually trigger via curl with a real workflowId that has send_email + ai_action steps
- Verify execution record created in Supabase with correct status progression
- Verify step execution records show completed status with output_payload

**Notes:**
- n8n has Supabase service_role credentials already (reuse "Halo-Efekt Supabase" credential)
- The Orchestrator does NOT need to call back to CMS -- it writes directly to Supabase
- Use `responseMode: "responseNode"` so webhook responds immediately while workflow continues
- Webhook step types handled: `send_email`, `ai_action`, `webhook` (HTTP Request node)
- The `webhook` step type becomes a native n8n HTTP Request node (SSRF protection via n8n's built-in safeguards or Code node validation)

---

### Iteration 2: Condition Branching in Orchestrator (M)

**Goal:** Add condition step handling to the Orchestrator so it can skip/include branches based on condition evaluation.

**Depends on:** Iteration 1

**Deliverables:**
- [ ] Code node: condition evaluator (port logic from `engine/condition-evaluator.ts`)
- [ ] Step loop handles `condition` step type: evaluate condition -> determine which branch to take (true/false)
- [ ] Skipped steps tracked (steps on the non-taken branch marked as `skipped`)
- [ ] Variable context built from trigger payload + accumulated step outputs
- [ ] Variable resolution (`{{variable}}` syntax) in step configs before execution
- [ ] Edge-based branching: condition step has true/false edges, loop follows the correct branch

**Verification:**
- Trigger a workflow with condition step (e.g., "if score > 5 then send_email else skip")
- Verify correct branch executed, other branch steps marked as skipped
- Verify variable context flows through: trigger vars available in conditions and step configs

**Notes:**
- Condition evaluator operators: `>=`, `<=`, `!=`, `==`, `>`, `<`, `contains`, `in` (same as CMS)
- Edge data has `sourceHandle: 'true'` / `'false'` for condition branching
- Variable context is a flat key-value map, same structure as CMS `VariableContext`

---

### Iteration 3: Native Delay Handling in Orchestrator (S)

**Goal:** Replace cron-based delay polling with n8n's native Wait node.

**Depends on:** Iteration 2

**Deliverables:**
- [ ] Step loop handles `delay` step type: compute duration from step_config (value + unit)
- [ ] Use n8n Wait node with computed duration (minutes/hours/days)
- [ ] Step execution updated to `waiting` during delay, `completed` after Wait node completes
- [ ] Execution status updated to `paused` during delay, `running` after resume
- [ ] `resume_at` timestamp written to step execution record (for monitoring/display in CMS)

**Verification:**
- Trigger a workflow with delay step (1 minute)
- Verify step shows `waiting` status in Supabase during delay
- After 1 minute, verify step completes and remaining steps execute
- Verify execution completes successfully end-to-end

**Notes:**
- n8n Wait node handles delay natively -- no cron polling, no process-due-delays endpoint
- Duration units: minutes (60000ms), hours (3600000ms), days (86400000ms) -- same math as CMS `handleDelay`
- The Wait node blocks the n8n execution (not the CMS) -- n8n is designed for this

---

### Iteration 4: CMS Trigger Route Simplification + Parallel Run (M)

**Goal:** Simplify the CMS trigger route to forward to n8n Orchestrator instead of executing locally. Run BOTH paths in parallel during transition.

**Depends on:** Iteration 3

**Deliverables:**
- [ ] New env var: `N8N_WORKFLOW_ORCHESTRATOR_URL` (separate from existing `N8N_WORKFLOW_EXECUTOR_URL`)
- [ ] Feature flag in trigger route: `USE_N8N_ORCHESTRATOR` env var (boolean)
- [ ] When flag ON: trigger route validates -> POST to n8n Orchestrator -> 202 (~40 LOC)
- [ ] When flag OFF: existing behavior (current executor path)
- [ ] Trigger route includes `trigger_type` matching logic (find workflows by trigger_type + tenant_id) before dispatching to n8n
- [ ] n8n Orchestrator accepts either `workflowId` (specific) or `trigger_type + tenant_id` (matching)
- [ ] Parallel testing: manually trigger same workflow via old path and new path, compare execution records
- [ ] Update trigger route to handle `workflow_id` parameter (dispatch specific workflow to n8n)

**Verification:**
- Set `USE_N8N_ORCHESTRATOR=true` in .env.local
- Trigger a workflow via CMS (or API) -- verify n8n Orchestrator receives and executes
- Compare execution records: old path vs new path should produce identical step statuses
- Verify 202 response returns within 1s (no timeout risk)

**Notes:**
- The feature flag allows safe rollback -- flip to false and old path resumes
- Trigger matching logic (`findMatchingWorkflows`) is a simple SELECT query -- stays in CMS trigger route temporarily, eventually n8n could do this itself
- Both paths write to the same `workflow_executions` / `workflow_step_executions` tables
- Do NOT delete old executor code yet -- parallel run phase

---

### Iteration 5: CMS Cleanup -- Delete Old Execution Code (M)

**Goal:** Remove all CMS execution code that is now handled by n8n Orchestrator.

**Depends on:** Iteration 4

**Parallel with:** Iteration 6

**Deliverables:**
- [ ] Delete `engine/executor.ts` (874 LOC)
- [ ] Delete `engine/action-handlers.ts` (338 LOC) -- BUT first extract `dryRunHandlers` + `generateMockOutput` to new file `engine/dry-run-handlers.ts`
- [ ] Delete `engine/trigger-matcher.ts` (30 LOC)
- [ ] Delete `app/api/workflows/callback/route.ts` (142 LOC)
- [ ] Delete `app/api/workflows/resume/route.ts` (142 LOC)
- [ ] Delete `app/api/workflows/process-due-delays/route.ts` (137 LOC)
- [ ] Delete `engine/__tests__/executor.test.ts` (713 LOC)
- [ ] Delete `engine/__tests__/action-handlers.test.ts` (574 LOC)
- [ ] Delete `engine/__tests__/trigger-matcher.test.ts` (88 LOC)
- [ ] Remove `USE_N8N_ORCHESTRATOR` feature flag -- new path is now the only path
- [ ] Remove `N8N_WORKFLOW_EXECUTOR_URL` env var reference (replaced by `N8N_WORKFLOW_ORCHESTRATOR_URL`)
- [ ] Simplify `actions.ts`: remove `dryRunWorkflow` that calls deleted `executeWorkflow`, update imports
- [ ] Update `dryRunSingleStep` to use `engine/dry-run-handlers.ts` instead of deleted `action-handlers.ts`
- [ ] Simplify trigger route to final ~40 LOC form (remove old code path)
- [ ] Verify build passes (`npm run build:cms`)
- [ ] Verify existing tests pass (`npm run test --workspace=apps/cms`)

**Verification:**
- `npm run build:cms` succeeds with zero errors
- Remaining tests pass (condition-evaluator, utils, dry-run-handlers)
- Trigger route works end-to-end via n8n Orchestrator
- Per-step testing (dry-run in CMS) still works with mock handlers

**Notes:**
- `dryRunHandlers` and `generateMockOutput` must survive -- they power the CMS test mode panel
- Create `engine/dry-run-handlers.ts` with these extracted functions BEFORE deleting `action-handlers.ts`
- The `isAsyncStepType` function is no longer needed (n8n handles sync/async distinction internally)

---

### Iteration 6: n8n Cleanup -- Delete Old Workflows (S)

**Goal:** Remove old n8n workflows that are replaced by the Orchestrator.

**Depends on:** Iteration 4

**Parallel with:** Iteration 5

**Deliverables:**
- [ ] Deactivate "Workflow Action Executor" in n8n UI
- [ ] Deactivate "Workflow Delay Processor" in n8n UI
- [ ] Delete workflow JSON files from `n8n-workflows/workflows/`:
  - `Workflow Action Executor.json`
  - `Workflow Delay Processor.json`
- [ ] Remove Supabase RPC function `claim_due_delay_steps()` via migration
- [ ] Remove `HOST_URL` dependency from n8n dispatch (Orchestrator writes directly to Supabase, no callback needed)

**Verification:**
- n8n dashboard shows only Workflow Orchestrator (no old executor/delay processor)
- No active n8n workflow calls CMS callback/resume/process-due-delays endpoints
- Migration applies cleanly: `supabase db push --dry-run`

---

### Iteration 7: Documentation + Skill Updates (S)

**Goal:** Update all documentation and skills to reflect the new architecture.

**Depends on:** Iterations 5 + 6

**Deliverables:**
- [ ] Update `n8n-workflows/CLAUDE.md` -- remove old Workflow Action Executor references, document Orchestrator pattern
- [ ] Update `.claude/skills/ag-workflow-engine/SKILL.md` -- remove CMS executor details, document n8n Orchestrator as execution path
- [ ] Update `.claude/skills/vps-n8n-patterns/SKILL.md` -- update Workflow Action Executor section to Orchestrator
- [ ] Update `apps/cms/CLAUDE.md` -- remove callback/resume/process-due-delays routes from route list
- [ ] Update `apps/cms/features/CLAUDE.md` -- update workflows feature description
- [ ] Update `memory.md` -- add architecture decision record for migration
- [ ] Update `docs/PROJECT_SPEC.yaml` -- mark migration task as done

**Verification:**
- All CLAUDE.md files reference correct file paths (no references to deleted files)
- Skill descriptions match the new architecture

---

## Risk Mitigation

### Parallel Run (Iteration 4)

The feature flag `USE_N8N_ORCHESTRATOR` enables safe parallel testing:
- Both paths write to the same DB tables
- Compare execution records side-by-side
- Instant rollback by flipping the flag to false

### n8n Orchestrator Failure Handling

If the n8n Orchestrator fails mid-execution:
- Global Error Handling workflow catches the error (already exists)
- Execution record in Supabase shows `running` (stale) -- need monitoring for stale executions
- Consider adding: n8n Code node that marks execution as `failed` on any unhandled error (try/catch wrapper around the main loop)

### Vercel Timeout Protection

After migration, the CMS trigger route does only:
1. Validate auth (sync, fast)
2. Validate body (sync, fast)
3. POST to n8n (one HTTP request, <1s)
4. Return 202

Total execution time: <2s. Well within 10s Vercel Hobby limit.

### Test Mode Preservation

CMS test mode (dry-run) is completely independent of the n8n execution path:
- Uses `dryRunHandlers` / `generateMockOutput` (mock handlers, no n8n call)
- Evaluates conditions locally (condition-evaluator stays in CMS)
- Per-step testing via `executeWorkflowStep` uses the same mocks
- No n8n required for testing -- works offline

---

## Environment Variables

### New

| Variable | Value | Where |
|----------|-------|-------|
| `N8N_WORKFLOW_ORCHESTRATOR_URL` | `https://n8n.trustcode.pl/webhook/workflow-orchestrator` | CMS `.env.local`, Vercel |
| `USE_N8N_ORCHESTRATOR` | `true` / `false` | CMS `.env.local` (temporary, iteration 4 only) |

### Removed (after iteration 5)

| Variable | Reason |
|----------|--------|
| `N8N_WORKFLOW_EXECUTOR_URL` | Replaced by `N8N_WORKFLOW_ORCHESTRATOR_URL` |
| `HOST_URL` dependency for callbacks | n8n Orchestrator writes directly to Supabase, no CMS callback |

### Unchanged

| Variable | Used by |
|----------|---------|
| `WORKFLOW_TRIGGER_SECRET` | CMS trigger route auth (still needed) |

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| CMS execution code | ~1663 LOC | 0 LOC (deleted) |
| CMS API routes for workflow | 4 (trigger, callback, resume, process-due-delays) | 1 (trigger only) |
| n8n workflows for execution | 2 (Action Executor + Delay Processor) | 1 (Orchestrator) |
| Delay granularity | 5-minute polling | Exact (native Wait node) |
| Timeout risk | Real (10s Vercel limit) | Eliminated (n8n has no timeout) |
| Test mode | Works | Unchanged (mock handlers in CMS) |
| Supabase RPC functions | `claim_due_delay_steps` | Removed |
