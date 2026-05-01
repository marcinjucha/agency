# AAA-T-210 — Workflow: step cancellation + retry endpoint + history UI

**Status:** DONE — merged to main 2026-05-01  
**Branch:** `feature/aaa-t-210-workflow-retry-cancellation-ui`  
**Notion:** https://app.notion.com/p/34f84f1476e08117ab36ed2628d5f9b5  
**Depends on:** T-208 + T-209 (retry foundation — workflow_snapshot, attempt_number, replay guard)

---

## Commits (clean history)

| SHA | What |
|-----|------|
| `9db8b6b` | feat: seed workflows.execute permission for Admin roles |
| `e94eedd` | feat: n8n retry engine — cancel steps + replay guard + full retry path |
| `45d085a` | feat: CMS type system + queries — cancelled status, snapshot, attempt_number |
| `c6f03d0` | feat: CMS execution history UI — attempts grouping + snapshot labels + cancelled styling |
| `d76f2cf` | feat: POST /api/workflows/retry endpoint (TDD, 7 tests) |
| `6d7d88e` | docs: update PROJECT_SPEC + Notion sync |
| `7a05cc3` | docs: update memory.md with T-210 learnings |

---

## Architecture Decisions

### Retry model: Path A — Continuation-with-attempts

**Decision:** Keep T-209's replay guard (reuse `output_payload` for completed steps, new attempt for failed/cancelled). Do NOT reuse `input_payload` on failed step retry — always re-render fresh.

**WHY:** Replay guard prevents double-email/double-AI call on retry (core value). Fresh render on failed steps covers 95% of use cases. Exact `input_payload` reuse deferred to **T-216** (low priority, 150 LOC, 9 files).

**Behavior matrix:**
| prev attempt status | On retry |
|---|---|
| `completed` | Reuse cached `output_payload` — no re-execution |
| `skipped` | Reuse skip |
| `failed` | New attempt, fresh render with current variableContext |
| `cancelled` | New attempt, fresh render (same as failed) |
| `pending`/`running` | New attempt, fresh render |

### Fetch and Initialize — retry mode as additive branch

**Decision:** Retry path is an `if (retryExecutionId)` branch at the top of Fetch and Initialize that returns early. Fresh-mode code below is BYTE-FOR-BYTE unchanged.

**WHY:** `Fetch and Initialize` handles 100% of production traffic (survey/booking webhooks). Modifying it in-place = maximum regression risk. Early return = safe surgical addition.

**Split into 3 atomic commits (user constraint):**
1. Decide Replay Action: `cancelled → new_attempt` (audit trail fix)
2. Placeholder throw in Fetch and Initialize (safe gate, fresh runs unaffected)
3. Full retry implementation (load existing execution, defense checks, rebuild state)

### Decide Replay Action: `cancelled → new_attempt`, NOT `continue`

**WHY:** `continue` would reuse the existing row and Mark Step Running would UPDATE `status='running'` — destroying the cancelled audit record. New attempt = new row = old cancelled row stays intact.

### parseWorkflowSnapshot() for all snapshot access

**WHY:** `step_config.headers` on webhook steps may contain Authorization/Bearer tokens. Any endpoint returning `workflow_snapshot` JSONB must sanitize through `parseWorkflowSnapshot()`.

### workflows.execute permission in T-210 (not follow-up)

User confirmed adding this permission in T-210. Seed migration + PERMISSION_GROUPS + endpoint + UI gate all in this task.

---

## Files Changed

### DB
- `supabase/migrations/20260501000000_add_workflows_execute_permission.sql` — seeds `workflows.execute` to `Admin` tenant_roles

**Gotcha:** `tenant_roles.name` = `'Admin'` (TitleCase), NOT `'admin'`. `super_admin` is `users.is_super_admin BOOLEAN`, not a role. Migration with lowercase names inserts ZERO rows silently. Always `SELECT DISTINCT name FROM tenant_roles;` before writing permission seed migrations.

### n8n
- `n8n-workflows/workflows/Workflows/Workflow Orchestrator.json`
  - `Handle Skipped and Failed` node: batch PATCH `pending/running → cancelled` on failure
  - `Fetch and Initialize` node: retry detection (UUID guard) + full retry path
- `n8n-workflows/workflows/Workflows/Workflow Process Step.json`
  - `Decide Replay Action` node: added `cancelled → new_attempt` case

### CMS TypeScript
- `apps/cms/lib/permissions.ts` — `'workflows.execute'` in PERMISSION_GROUPS.workflows.children
- `apps/cms/features/workflows/types.ts`
  - `StepExecutionStatus` += `'cancelled'`
  - New `WorkflowSnapshot` type (with `workflow`, `steps[]`, `edges[]`)
  - `StepExecutionWithMeta` += `attempt_number: number`
  - `ExecutionWithSteps` += `workflow_snapshot: WorkflowSnapshot | null`
  - `parseWorkflowSnapshot()` helper (sanitizes webhook headers, returns null for legacy `'{}'`)
- `apps/cms/features/workflows/queries.server.ts` + `queries.ts`
  - SELECT includes `workflow_snapshot`
  - ORDER BY `attempt_number ASC` for step_executions
  - Both use `parseWorkflowSnapshot()` (no duplicated logic)
- `apps/cms/lib/messages.ts` — `stepExecutionCancelled`, `retryButton`, `retryConfirmTitle`, `retryConfirmDescription`, `retryToastSuccess`, `retryAlreadyRunning`, `retryDisabledRunning`, `'workflows.execute'` label
- `apps/cms/lib/routes.ts` — `workflowRetry: '/api/workflows/retry'`

### CMS execution history UI
- `apps/cms/features/workflows/utils/group-attempts.ts` — `groupAttemptsByStep()` pure utility
- `apps/cms/features/workflows/utils/__tests__/group-attempts.test.ts` — 6 TDD tests
- `apps/cms/features/workflows/components/StepExecutionTimeline.tsx`
  - `cancelled` badge: `border-zinc-500/30 bg-zinc-500/10 text-zinc-400` + tooltip
  - Attempts accordion: latest visible, previous in `Collapsible`
  - `snapshot?` prop + `snapshotStepMap` (Map<step_id, SnapshotStep>)
  - 4-tier label resolution: `_name > snapshot step_type > live STEP_TYPE_LABELS > raw string`
  - Backward compat: `null` snapshot → falls back to tiers 3+4

### CMS retry endpoint
- `apps/cms/app/routes/api/workflows/retry.ts` (NEW)
  - `handleRetryPost` exported function (thin route pattern, testable)
  - User session auth → `workflows.execute` permission gate
  - Load execution + `.eq('tenant_id', tenantId)` (defense in depth)
  - Optimistic lock: `PATCH WHERE status IN ('failed','cancelled') RETURNING id` → 409 if race
  - Dispatch to n8n with `{ ...trigger_payload, __retry_execution_id__: executionId }`
  - Rollback on dispatch failure (status reverted to `'failed'`)
  - Cross-tenant → 404 (no existence leak)
- `apps/cms/app/routes/api/workflows/__tests__/retry.test.ts` — 7 TDD tests
- `apps/cms/features/workflows/components/ExecutionDetail.tsx`
  - Retry button (AlertDialog confirm) when `canRetry && status IN (failed, cancelled)`
  - Disabled + tooltip when `status === 'running'`
  - Error feedback: 409 → `refetch()` (polling picks up running); 500/502 → `window.alert`
  - Passes `snapshot={execution.workflow_snapshot}` to `StepExecutionTimeline`

---

## Tests Added

| File | Tests | Type |
|------|-------|------|
| `features/workflows/utils/__tests__/group-attempts.test.ts` | 6 | Unit (pure function) |
| `app/routes/api/workflows/__tests__/retry.test.ts` | 7 | Integration (mocked Supabase) |

Test cases for retry endpoint:
1. 403 unauthenticated
2. 403 missing `workflows.execute` permission
3. 404 execution not found
4. 404 cross-tenant rejection (security test — same 404 as not found)
5. 409 optimistic lock fails (status already `running`)
6. 200 successful retry dispatch
7. 502 dispatch failure + lock reversal

---

## Deferred to T-216

`apps/cms/features/workflows/__tests__/` shows T-216 exists in Notion (Low priority, ~150 LOC):
- Exact reuse of `input_payload` on failed step retry
- `Decide Replay Action`: copy `prev.input_payload` to new attempt INSERT
- Per-handler: `Resolve Input Payload` node + conditional render block (skip render if cached)

**MVP behavior** (post T-210): failed steps re-render fresh. Old `input_payload` stays in DB as audit but is NOT used on retry.

---

## Architecture Debt (not in scope)

- `TRIGGER_TYPES` literal array duplicated in Fetch and Initialize retry path — 5th duplication site (project-wide, tracked in memory.md, needs `TRIGGER_REGISTRY`)
- `_name` field access pattern (`step_config as Record<string, unknown>)?._name`) appears in 3 places: `WorkflowEditor.tsx`, `ConfigPanelWrapper.tsx`, `StepExecutionTimeline.tsx` — extract `getStepDisplayName()` helper once T-211 finalizes the `_name` surface
- Pre-existing test failures (5 test files, 7 tests) in `features/workflows/__tests__/` — pre-existing, not regressions from T-210

---

## What comes next (potential tasks)

1. **T-216** — exact `input_payload` reuse on retry (when template/prompt edited between failure and retry)
2. **Manual smoke test** — re-import Orchestrator + Process Step JSON into n8n, run end-to-end retry scenario
3. **supabase db push** — apply `20260501000000_add_workflows_execute_permission.sql` to staging/prod

---

## Key Gotchas for Future Sessions

- **`tenant_roles.name` TitleCase**: always `SELECT DISTINCT name FROM tenant_roles;` before writing permission seed migrations. Never assume lowercase.
- **`super_admin` = BOOLEAN flag**: `users.is_super_admin`, NOT a tenant_roles row. No WHERE clause will match it.
- **n8n import required**: after ANY JSON edit to workflow files, re-import in n8n UI + re-select Supabase credential. n8n does not auto-sync.
- **`parseWorkflowSnapshot()`**: use it whenever returning `workflow_snapshot` JSONB to UI. Sanitizes webhook headers.
- **Replay guard audit trail**: `cancelled → new_attempt` (never `continue`). Apply same logic to any future terminal status that should be preserved in history.
- **Fetch and Initialize fresh-mode**: byte-identical to pre-T-210 — validated by 3 independent validator passes. Retry path is a clean early-return branch.
