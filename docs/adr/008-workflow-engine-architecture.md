# ADR-008: Workflow Engine Architecture

**Status:** Accepted
**Date:** 2026-04-27 (workflow engine introduced via AAA-T-183), documented retroactively 2026-05-15
**Context:** Halo Efekt — replacing single-purpose n8n workflows with a generalised execution engine
**Deciders:** Marcin Jucha
**Supersedes:** ADR-007 (Standalone n8n "Survey Response AI Analysis" workflow — deleted 2026-05-15)

---

## Context

Original background processing (former ADR-007) was a single, hard-coded n8n workflow: "Survey Response AI Analysis". Webhook → fetch response → Claude Haiku → save `ai_qualification` JSONB. It worked for one use case.

Reality outgrew it within months:

- **Email notifications** in multiple flavours: `form_confirmation`, `booking_confirmation`, `booking_reminder`, marketing drips
- **Conditional branching** (e.g. send confirmation only if AI score > threshold)
- **Retries with attempt counters** for transient API failures
- **Scheduled triggers** (cron-style, drip campaigns, partner SLA monitors)
- **Multi-step orchestrations** (AI score → branch → email → wait → followup)
- **CMS-authored workflows** — non-developers configuring triggers, conditions, actions visually

Building a dedicated n8n workflow per use case duplicates orchestration glue (state, errors, retries, logging, Sentry init) and concentrates business logic in n8n JSON files that are painful to diff and review.

---

## Decision

**Two-workflow n8n architecture: a single Orchestrator + per-step-type Handler subworkflows. Workflow definitions live in the database (`workflows` table, `workflow_snapshot` JSONB) and are dispatched on trigger.**

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  CMS (TanStack Start)                                    │
│  ├─ Visual builder (ReactFlow canvas, panels)            │
│  ├─ Workflow CRUD → workflows table                      │
│  └─ POST /api/workflows/trigger  (fire-and-forget)       │
└──────────────────────────────────────────────────────────┘
                          │ webhook
                          ▼
┌──────────────────────────────────────────────────────────┐
│  n8n: Orchestrator workflow                              │
│  ├─ Match trigger → load workflow_snapshot               │
│  ├─ Walk step graph: condition branching, retries        │
│  ├─ For each step: executeWorkflow → Step Handler        │
│  ├─ Persist execution + step_execution rows              │
│  └─ Replay decision: continue / new_attempt              │
└──────────────────────────────────────────────────────────┘
                          │ executeWorkflow per step
                          ▼
┌──────────────────────────────────────────────────────────┐
│  n8n: Step Handler subworkflows (one per step type)      │
│  ├─ Step - Trigger Handler (data hydration)              │
│  ├─ Step - Send Email Handler                            │
│  ├─ Step - Condition Handler                             │
│  ├─ Step - Delay Handler                                 │
│  ├─ Step - Webhook Handler (SSRF-guarded)                │
│  └─ Step - AI Action Handler (Claude)                    │
└──────────────────────────────────────────────────────────┘
                          │ Supabase service role
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase: workflows, workflow_executions,               │
│  workflow_step_executions (audit), triggers              │
└──────────────────────────────────────────────────────────┘
```

---

## Rationale

### Why a generic engine instead of more single-purpose workflows

| Concern | Per-workflow (former ADR-007) | Workflow engine |
|---|---|---|
| Adding a new use case | Copy/paste an n8n JSON, hand-edit | Add a row in `workflows`, optionally a new step handler |
| Conditional branching | Inline `IF` nodes per workflow | First-class `condition` step type |
| Retries | Re-implement each time | Orchestrator-level attempt counter + replay |
| State between steps | Workflow-local | Persisted `workflow_executions` + `step_executions` |
| Sentry init | Copy/paste init Code node | Centralised in Orchestrator |
| Variable substitution | Manual `{{ }}` per workflow | Trigger Handler hydrates context once |
| Non-developer authoring | Edit n8n JSON | Visual ReactFlow builder in CMS |

### Why two workflows (Orchestrator + Handlers), not one mega-workflow

Single workflow with branching for every step type would:

- Concentrate all logic in one massive n8n file (un-reviewable)
- Force every step's credentials/env into the same workflow scope
- Lose the ability to test/replay individual step types in isolation

Two workflows let each Handler stay small (~5–15 nodes), own its credentials, and be tested independently. Orchestrator stays focused on graph traversal + persistence.

### Why n8n over a custom Node.js worker

- **Visual editor** for credentials, retries, scheduled triggers — already production-quality
- **Queue mode** with Redis + multiple workers for scaling out
- **Built-in monitoring** (Prometheus `/metrics`, execution history UI)
- **Self-hosted on the same VPS** as other services — no extra infra

The cost: n8n Code node sandbox restrictions (no `fetch`, no SDK packages by default). We pay it with native `https` + read-only volume mount for `@sentry/node`. See `vps-n8n-patterns` skill.

### Why `workflow_snapshot` JSONB instead of normalised tables

Trigger time is the moment of truth. The snapshot freezes the workflow definition into the execution row so subsequent edits to `workflows` don't retroactively change running/historical executions. Snapshot includes step graph, config, and trigger payload schema.

**Sanitization at boundary:** `parseWorkflowSnapshot()` strips sensitive headers (Authorization/Bearer) from webhook step configs before returning to the UI. Any new endpoint exposing snapshots must route through this helper.

---

## Key Mechanics

### Trigger hydration (Trigger Handler subworkflow)

Triggers carry payload shape that's specific to the source (form submission, booking, cron). The first step in every execution is a synthetic **Trigger Handler** that hydrates the variable context (`{{ trigger.foo }}`) before downstream steps run. Without this, every step handler would need bespoke trigger-payload knowledge.

### State management: `$getWorkflowStaticData`

n8n's `$getWorkflowStaticData('global')` is **per workflow ID, not per execution**. With concurrent executions, naive writes overwrite each other. Pattern: index state by `executionId` (`state[executionId] = {...}`) and read/write only the current execution's slot.

**`SplitInBatches` does NOT preserve `staticData` across iterations** — proven empirically. Don't use it for stateful step loops; iterate via Orchestrator graph walk instead.

### Condition branching

`condition` step compares two values with a literal fallback: if left/right both expression-resolvable, evaluate as expression; otherwise treat as literal. Required because variable resolution can return undefined when a trigger field is missing, and forcing the user to wrap literals in `{{ '...' }}` quoting is awful UX.

### Retry / replay (`Decide Replay Action`)

After a step fails (transient API error, timeout), the Orchestrator's `Decide Replay Action` node decides whether to:

- `continue` — only when prior `step_execution.status === 'pending'` AND `id` matches current step exec ID (first execution)
- `new_attempt` — otherwise (prior `failed` or `cancelled`)

Guard MUST check **status**, not just ID — Orchestrator reuses the latest-attempt row's ID on retry, so an ID-only guard fires on every retry and routes to `continue`, silently breaking the attempt counter (proven bug from AAA-T-221).

`cancelled` status also routes to `new_attempt`, never `continue` — `continue` would overwrite the cancelled row's status and destroy audit history.

### Test mode

CMS "Test workflow" button dispatches to **the real n8n endpoint** with a mock trigger payload from the editor's panel. Test executions are flagged in `workflow_executions.is_test = true` and excluded from production metrics. Test mode is not a separate code path — same Orchestrator, same handlers, same persistence.

### `lead_scored` trigger has no live dispatcher (post-AAA-T-63)

It's registered in `TRIGGER_REGISTRY` (handler subworkflow, Zod schema, UI selector), but no code emits it after the standalone AI analysis workflow was deleted. The `ai_action` step does **not** dispatch `lead_scored` either, despite the suggestive name. Future agents adding docs MUST verify the dispatcher exists in code before attributing "Fired from: X" — wrong attribution silently lies.

---

## Step Handler Contract

Every Step Handler subworkflow obeys this contract (enforced by `ag-n8n-step-handlers` skill):

**Input (from Orchestrator):**

```jsonc
{
  "context": { /* trigger data + prior step outputs */ },
  "stepConfig": { /* step-specific config from workflow_snapshot */ },
  "executionId": "uuid",
  "stepId": "uuid",
  "alreadyPersisted": false  // Orchestrator handles persistence by default
}
```

**Output (back to Orchestrator):**

```jsonc
{
  "context": { /* updated context for downstream steps */ },
  "result": { /* step-specific output */ },
  "shouldSkip": false  // condition handlers can short-circuit
}
```

**Boilerplate:** every handler imports the shared `supabaseRequest()` helper (regenerated via `pnpm n8n:build regenerate-helpers`). Never hand-edit handler JSON. Edit canonical sources in `n8n-workflows/scripts/evaluators/*.js`, regenerate, lint with `pnpm n8n:build lint-helpers` (must exit 0 before commit).

**Anti-patterns:**

- ❌ `convertFieldsToString` n8n option (breaks JSONB roundtrips)
- ❌ `SplitInBatches` for stateful loops (state loss across iterations)
- ❌ Constructing URLs via `new URL()` for SSRF check (use the SSRF regex pattern in the skill)

---

## Where to add what

| You want to... | Action |
|---|---|
| Add a new trigger type (e.g. `scheduled`) | Extend `TRIGGER_REGISTRY` first (Zod schema, handler subworkflow, type union, UI label). Reuses 10 sites. Don't hand-add to each. |
| Add a new step type | New Step Handler subworkflow + register in step registry + add ReactFlow node type + config panel + StepLibrary entry |
| Add a new condition operator | Extend Condition Handler subworkflow (no Orchestrator changes) |
| Trigger workflow from new source | POST `/api/workflows/trigger` with trigger type + payload. Fire-and-forget; the route returns <200ms. |

**Reference skills:**

- `ag-workflow-engine` — engine internals (Orchestrator, state, condition, retry, test mode)
- `ag-n8n-step-handlers` — handler contract, helpers, anti-patterns, SSRF
- `ag-workflow-ui` — ReactFlow canvas, panels, test mode UI
- `vps-n8n-patterns` — n8n Code node constraints, native `https`, Sentry init, fire-and-forget webhook

---

## Architectural Constraints (force-multipliers)

These items unlock multiple downstream features simultaneously and should bundle, not split:

1. **T-04 `scheduled` trigger MUST bundle `TRIGGER_REGISTRY` refactor.** `trigger_type` is currently duplicated across 10 sites. Acceptance: (1) introduce registry in `packages/database` or shared module, (2) migrate all 10 sites, (3) THEN add `scheduled` as first registry-native trigger. Unlocks S6 (drip emails), B5 (monthly report cron), B8 (speed guarantee SLA monitor) simultaneously.
2. **B5 Monthly Partner Report scope = HTML email AND PDF.** Not email-first MVP. Partners expect downloadable PDF artifact ("dostaję raport jak w korpo"). Both rendering paths day one.
3. **Tenant cascade deletion (T-15) replaces B7 sandbox at low client volume.** At <10 simultaneous demos, dedicated sandbox is overengineering. `DELETE FROM tenants WHERE id = ?` with `ON DELETE CASCADE`. Defer real sandbox infra to P2.

---

## Consequences

### Positive

- ✅ One engine handles email, AI scoring, branching, retries, scheduling — no new n8n workflow per use case
- ✅ Workflow definitions reviewable as database rows + visual diff in CMS, not n8n JSON
- ✅ Audit trail per step execution (`workflow_step_executions`) — debuggable retries
- ✅ Non-developers can author/modify workflows via the visual builder
- ✅ Replay/retry logic centralised in Orchestrator — handlers stay simple

### Negative

- ⚠️ Two-workflow architecture has more moving parts than a single hard-coded workflow
- ⚠️ Handler regeneration via `n8n-builder.mjs` is mandatory — hand-editing handler JSON drifts from canonical sources
- ⚠️ `$getWorkflowStaticData` and `SplitInBatches` gotchas are non-obvious — easy to introduce concurrency bugs
- ⚠️ `workflow_snapshot` JSONB hides sensitive headers — every new snapshot-returning endpoint must route through sanitiser

### Mitigations

- `ag-workflow-engine` + `ag-n8n-step-handlers` skills capture the gotchas; validators flag missing sanitisation
- `pnpm n8n:build lint-helpers` exits non-zero on canonical/generated drift — gate commits on it
- New trigger/step types follow a checklist in `ag-n8n-step-handlers` skill

---

## Related ADRs

- [ADR-006: Project Structure](./006-agency-project-structure.md) — Section 12 references this ADR for "background processing"
- ~~ADR-007~~ — Superseded and deleted 2026-05-15

## Related skills

- `ag-workflow-engine`, `ag-n8n-step-handlers`, `ag-workflow-ui`, `vps-n8n-patterns`, `vps-n8n-stack`

---

**Last Updated:** 2026-05-15
**Next Review:** When external workflow authoring (customer-facing) or multi-tenant workflow templates are on the roadmap.
