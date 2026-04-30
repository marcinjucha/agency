# N8n Workflows — Workflow Orchestrator + Background Processing

n8n owns ALL workflow execution. CMS sends fire-and-forget POST, n8n Orchestrator handles everything: step sequencing, handler dispatch, state management, DB writes.

Also hosts standalone workflows: Survey Response AI Analysis, Marketplace sync (4 workflows), Send Email subworkflow.

**Detailed architecture docs:** `docs/guides/workflow/WORKFLOW_ENGINE.md` (diagrams, state management, data flow)
**Handler patterns:** `.claude/skills/ag-n8n-step-handlers/SKILL.md`

## The Weird Parts

### Custom Modules Mount (Sentry SDK)

**Why:** Code nodes in n8n can't access npm packages by default. Need to mount external modules as read-only volume.

```yaml
# docker-compose.yml
volumes:
  - ./custom_modules/node_modules/@sentry:/usr/local/lib/node_modules/@sentry:ro
environment:
  - NODE_FUNCTION_ALLOW_EXTERNAL=@sentry/node,@sentry/tracing
```

**Critical:** Install modules OUTSIDE container, then mount. n8n official image doesn't persist npm installs.

### Re-Import Required After Every Workflow JSON Edit (and Credentials Drop)

Editing `workflows/*.json` does NOT auto-sync to the running n8n instance — every JSON-touching commit invalidates the imported snapshot. A multi-iteration debugging session needs re-import after **each** fix commit, not once at session end. On top of that, n8n drops credential refs on import: click EACH node with credentials → select from dropdown → save. ~5 min per workflow, unavoidable.

**Why captured:** Discovered repeatedly during long debugging sessions — assuming "I already imported this workflow today" lets stale logic run for hours. The merge checklist for any workflow JSON change MUST include "re-import in n8n + verify credentials". Long-term mitigation tracked as follow-up: build an n8n import CLI that preserves credential refs by name.

### n8n Sandbox Limitations

Code nodes run in sandboxed VM. Missing globals:
- **No `fetch()`** — use `https.request()` with callback pattern
- **No `URL` constructor** — use regex: `url.match(/^https?:\/\/([^/:]+)(:\d+)?(\/.*)?$/)`
- **No `crypto.randomUUID()`** — use Math.random()-based uuid helper
- **`require()` limited** — only `https`, `@sentry/node` (mounted)

### SplitInBatches Loses State Between Iterations

Each iteration gets a **fresh original item** from the input queue. State accumulated in iteration N is lost at N+1. Fix: `$getWorkflowStaticData('global')` persists across iterations. Orchestrator uses this for variableContext, skippedStepIds, failed flag.

### `$getWorkflowStaticData('global')` Is Per Workflow ID, Not Per Execution

staticData is scoped to the **workflow ID**, not the execution. Moving a Code node that reads/writes staticData from Orchestrator to a subworkflow silently changes which bucket it reads from (different workflow = different staticData). Caused P0 bug during Process Step subworkflow extraction — state written in main workflow was invisible to subworkflow. Fix: pass state explicitly via item data to subworkflows, use `state[executionId]` dictionary pattern for concurrent execution isolation.

### Set Node v3.4 Defaults to REPLACE (Not Merge)

Set node strips ALL fields not explicitly assigned. Looks like "add these fields" but actually means "replace everything with only these fields". Pipeline data silently lost. Fix: never use Set for passthrough — use Code node with `return $input.all()` and modify fields in-place, or use Set with mode "Combine > Merge".

### executeWorkflow Replaces Caller Data

`executeWorkflow` output completely replaces the caller's item. Every handler MUST return `{ json: { ...item, stepResult } }` to preserve orchestrator context.

### executeWorkflow Config Matters

- `mappingMode: "autoMapInputData"` — sends full pipeline data. **NOT `defineBelow` with empty value** (sends nothing when `convertFieldsToString: false`). When `convertFieldsToString: true`, it masks the empty-value bug by sending garbage stringified data instead of nothing.
- `convertFieldsToString: false` — preserves objects. When `true`, `resolvedConfig: {prompt: "..."}` becomes `"[object Object]"`

### Single Terminal Sink Rule (Output Aggregation Race)

A subworkflow's output to its caller is whichever terminal node (no outgoing connection) finishes **last** — n8n picks "last executed" non-deterministically when multiple terminal sinks exist. A side-effect Code node returning `[]` finishing after the result-emitter silently makes the subworkflow output empty.

**Verified production bug (T-209, 2026-04-30):** parallel `Process Step Result` + `Mark Step Running` (returns `[]`) caused the workflow to halt after the first iteration because the empty-array sink won the race.

**Rule:** every subworkflow MUST have exactly ONE terminal sink. Side-effect Code nodes (`return []`) must be wired UPSTREAM in the chain (their output flowing into the eventual single terminal node), never as parallel sinks alongside the result emitter.

## Critical Mistakes We Made

### Queue Mode Not Obvious

Default n8n runs workflows in-memory (blocks main instance). Webhook responds slowly (5-8s). Fix: `EXECUTIONS_MODE=queue` + Redis. Response time: 5-8s → <200ms. Wasted 2h debugging before discovering.

### Fan-In Race Condition

n8n executes downstream node when ANY upstream completes, not ALL. Parallel Supabase nodes → `$('NodeName') hasn't been executed` errors. Fix: `Promise.all()` in single Code node.

### Supabase UPDATE Replaces Pipeline Data

Native Supabase UPDATE node output is the DB row, not original enriched item. Fix: dead-end pattern — wire upstream to both UPDATE (no output connections) and downstream node directly.

### Switch Condition Order: `failed` Must Be First

Failed items have no `stepType` field. If `failed` check is after step-type conditions, it never matches (undefined !== any type). Falls to fallback. During editing, `failed` condition got lost entirely. Always put `failed` at index 0.

### Switch `rules` vs `connections` Drift

A Switch node's `rules` array can hold a value whose corresponding key is missing from the source-node's `connections` object — a leftover from a partial edit. n8n does NOT validate this on import: the orphaned rule routes silently to whichever wire happens to exist at that array index, causing silent mis-routing. When reviewing any Switch node JSON, verify EVERY rule value also exists as a key under `connections.<switch-node-name>` for the source. Tooling follow-up: `n8n-builder.mjs` should grow a generic `add-switch-case --workflow X --node Y --condition Z` command that targets any Switch node by name within any workflow JSON, with `--dry-run` mandatory before mutating — currently only `Workflow Process Step.json` routing is automated, every other Switch (Trigger Handler, Send Email handler, etc.) requires hand-editing.

### Condition Evaluator + Pre-Resolved Literals

Prepare Current Step resolves `{{overallScore}}` → `7` before condition handler. Handler gets `"7 >= 5"`, looks for key "7" in context → undefined → false. Fix: `coerceNumeric()` fallback for left operand.

### JSONB Double-Encode

`supabaseRequest()` does `req.write(JSON.stringify(body))`. If `output_payload` is already `JSON.stringify()`'d, PostgREST stores string-in-string. PostgREST handles JSONB natively — never `JSON.stringify()` values going into JSONB columns. Fix: pass objects directly.

## Operational

### Stuck Execution Cleanup via PostgREST PATCH

When `workflow_executions` / `workflow_step_executions` rows stuck at `status='running'` from aborted runs, fix in the DB directly — no n8n UI clicks required:

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/workflow_step_executions?status=in.(running,pending)" \
  -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Prefer: return=minimal" \
  -d '{"status":"cancelled","completed_at":"<now>","error_message":"<reason>"}'
```

Same pattern for `workflow_executions`. Saves dozens of clicks vs cancelling each execution in the n8n UI. WHY captured: the Orchestrator can leave rows running indefinitely after a hard abort (no `finally`-style cleanup); operationally we mass-cancel rather than chase individual executions.

## Tooling

### `n8n-builder.mjs` — Workflow Authoring CLI

Located at `n8n-workflows/scripts/n8n-builder.mjs`. Invoke via `npm run n8n:build -- <command>` from the workspace root.

Commands:
- `create-handler` — writes a new step-handler subworkflow (Step - *.json) by inlining canonical evaluator JS from `scripts/evaluators/*.js` into the Code-node body. Safe (only writes new file).
- `add-route` — mutates Process Step Switch `connections` in-place to wire a new step type. **Riskier** — currently lacks `--dry-run`; review the diff before committing.
- `regenerate-helpers` — re-inlines the canonical `supabaseRequest` helper into all opt-in Code nodes. Opt-in is via the marker `// @inline supabase-request` at the top of the Code node body. Adding a new shared helper = one entry in the INLINE_HELPERS map + one evaluator file.

WHY this design: handler JSONs are export artifacts — diffing/reviewing logic embedded as a JSON-escaped string is hostile (newlines become `\n`, no syntax highlighting, no linting). Keeping evaluators as standalone `.js` files lets the build step inline them at scaffold time while preserving normal editor tooling. Pattern generalizes: any time JS-as-string ships in a JSON config, write the source as a real file and inline it via build script.

Follow-up tooling (tracked): `add-switch-case` generic command for any in-workflow Switch (Trigger Handler, Send Email handler routing, etc.) with mandatory `--dry-run`.

## Workflow Retry Foundation (T-208 / T-209, 2026-04-30)

Replay engine landed in `Workflow Process Step.json`: a 4-node sequence (`Hydrate State From DB` → `Find Latest Attempt` → `Decide Replay Action` → `Insert New Attempt`) implements the Continuation-with-attempts model. `Mark Step Running` is gated by a `Should Mark Running` IF, and every handler now persists its incoming payload via `Save Input Payload` for audit. `workflow_executions.workflow_snapshot` (JSONB) decouples in-flight executions from live workflow edits.

User-facing retry surface — Retry button, attempt history UI, batch cancellation — is intentionally deferred and tracked as T-210. Architecture supports it additively without rewrite (per the Continuation model captured in `docs/guides/workflow/WORKFLOW_RETRY_ARCHITECTURE.md`).

## MiniMax Agent Subworkflow

Reusable Claude API wrapper (workflow ID: `xaU50vf4eiNTeqSf`). Any workflow needing AI calls `executeWorkflow` here — never calls Claude directly.

**Credential:** `MiniMax` (Anthropic credential, LangChain node) — handles `anthropic-version` headers automatically.

**Output:** `content[].type === 'text'` — NOT `content[0]` (that's `thinking` type). Strip markdown code fences before `JSON.parse()`.

**Callers:** Survey Response AI Analysis, Workflow Orchestrator (via AI Action Handler)

## Workflow Orchestrator

**File:** `n8n-workflows/workflows/Workflows/Workflow Orchestrator.json`

Receives `{ workflowId, tenantId, triggerPayload }` from CMS → fetches definition from Supabase → topological sort → SplitInBatches loop → dispatches each step to **Workflow Process Step** subworkflow → writes state directly to Supabase.

**Two-workflow architecture:** Orchestrator handles sequencing (SplitInBatches loop, state initialization, step preparation). Process Step subworkflow (`RWzILX8sZPGkfl1m`) handles routing by step type and dispatching to individual handlers. Extracted to keep Orchestrator focused and reduce node count.

**State management:** `$getWorkflowStaticData('global')` in Orchestrator — initialized in Fetch and Initialize, read in Prepare Current Step. State is passed to Process Step subworkflow via item data (staticData doesn't cross workflow boundaries). Process Step Result writes back via item return, Orchestrator persists to staticData. Uses `state[executionId]` dictionary pattern for concurrent execution isolation.

**Route by Step Type** (in Process Step subworkflow): 12 outputs — failed(0), __skipped__(1), send_email(2), ai_action(3), webhook(4), switch(5), delay(6), get_response(7), update_response(8), get_survey_link(9), trigger_types(10, OR), fallback(11). (After AAA-T-211 + AAA-T-206: condition replaced by switch; per-action steps added.)

**Trigger steps are pure pass-through (AAA-T-212):** Trigger Handler is intentionally a 2-node no-op (Start → Pass Through). It exists for handler-per-step-type consistency but does NO hydration — emits `outputPayload: {}`. Initial `variableContext` comes from the Orchestrator's `buildTriggerContext`, which is a universal pass-through of the caller payload + `trigger_type`. Workflows that need response/survey_link/appointment/tenant data must use explicit `get_response` / `get_survey_link` / `get_*` steps. Rule: handlers never auto-fetch derived data; everything flows through `variableContext` produced by explicit steps.

**Data model:** `responses.answers` = JSONB (`{questionId: "answer"}`), `surveys.questions` = JSONB (array). No separate `survey_answers` or `questions` tables.

See `docs/guides/workflow/WORKFLOW_ENGINE.md` for full internals with diagrams.

## Gotchas (n8n Workflow Authoring)

### SplitInBatches MUST Have Loop-Back Connection

Without connection from last node back to SplitInBatches, only first item is processed. Silent data loss — n8n shows successful execution.

### Code Node onError Needs Explicit Error Output Wiring

`onError: continueErrorOutput` is not enough. Must ALSO add error connection in connections JSON (output index 1 to error handler). Without wiring, errors fall to global errorWorkflow.

### n8n Supabase Node Default Operation is `create`

Without explicit `"operation": "getAll"`, Supabase node tries to INSERT filter values as new row. Silent data corruption.

### n8n Supabase Node Filter Expressions Unreliable

Both `$json.workflowId` and `$('NodeName').first().json.field` fail to filter correctly in native Supabase GET nodes — return all rows instead of filtered set. Fix: inline REST API calls via `supabaseRequest()` in Code nodes.

### n8n HTTP Request: specifyBody "string" for Nested Objects

`bodyParameters` can't handle nested payload objects. Fix: `specifyBody: "string"` + `JSON.stringify()`.

### Wait Node Works Inside SplitInBatches

n8n serializes execution state, so Wait inside SplitInBatches works. Useful for rate-limited API calls. Wait node MUST have `"unit": "seconds"` explicitly — default is minutes.

## Quick Reference

| Fact | Value |
|------|-------|
| Orchestrator webhook | `POST /webhook/workflow-orchestrator` |
| Auth | `ORCHESTRATOR_WEBHOOK_SECRET` Bearer token |
| AI model | Claude Haiku 4.5 via MiniMax Agent |
| Cost | ~$0.0008/analysis |
| Queue | Redis (`EXECUTIONS_MODE=queue`) |
| Error tracking | GlitchTip (Sentry-compatible) |
| Process Step subworkflow | ID: `RWzILX8sZPGkfl1m` |
| Workflow files | `n8n-workflows/workflows/Workflows/` (engine) |
| Marketplace files | `n8n-workflows/workflows/Marketplace/` (standalone) |

**Credentials Required:**
1. **MiniMax** — Anthropic LangChain credential (`sk-ant-...`)
2. **Supabase account** — Service Role Key (NOT anon)
3. **GlitchTip Halo-Efekt** — Sentry DSN (`https://[key]@glitchtip.trustcode.pl/1`)

**Environment Variables:**
```bash
ORCHESTRATOR_WEBHOOK_SECRET=<shared-secret>
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=redis
```

**Monitoring URLs:**
- N8n UI: `https://n8n.trustcode.pl/`
- GlitchTip: `https://glitchtip.trustcode.pl/`
