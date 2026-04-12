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

### Credential IDs Don't Survive Import

n8n workflow JSON contains workspace-specific credential IDs. After import: click EACH node with credentials → select from dropdown → save. ~5 min per workflow, unavoidable.

### n8n Sandbox Limitations

Code nodes run in sandboxed VM. Missing globals:
- **No `fetch()`** — use `https.request()` with callback pattern
- **No `URL` constructor** — use regex: `url.match(/^https?:\/\/([^/:]+)(:\d+)?(\/.*)?$/)`
- **No `crypto.randomUUID()`** — use Math.random()-based uuid helper
- **`require()` limited** — only `https`, `@sentry/node` (mounted)

### SplitInBatches Loses State Between Iterations

Each iteration gets a **fresh original item** from the input queue. State accumulated in iteration N is lost at N+1. Fix: `$getWorkflowStaticData('global')` persists across iterations. Orchestrator uses this for variableContext, skippedStepIds, failed flag.

### executeWorkflow Replaces Caller Data

`executeWorkflow` output completely replaces the caller's item. Every handler MUST return `{ json: { ...item, stepResult } }` to preserve orchestrator context.

### executeWorkflow Config Matters

- `mappingMode: "autoMapInputData"` — sends full pipeline data. **NOT `defineBelow` with empty value** (sends nothing when `convertFieldsToString: false`)
- `convertFieldsToString: false` — preserves objects. When `true`, `resolvedConfig: {prompt: "..."}` becomes `"[object Object]"`

## Critical Mistakes We Made

### Queue Mode Not Obvious

Default n8n runs workflows in-memory (blocks main instance). Webhook responds slowly (5-8s). Fix: `EXECUTIONS_MODE=queue` + Redis. Response time: 5-8s → <200ms. Wasted 2h debugging before discovering.

### Fan-In Race Condition

n8n executes downstream node when ANY upstream completes, not ALL. Parallel Supabase nodes → `$('NodeName') hasn't been executed` errors. Fix: `Promise.all()` in single Code node.

### Supabase UPDATE Replaces Pipeline Data

Native Supabase UPDATE node output is the DB row, not original enriched item. Fix: dead-end pattern — wire upstream to both UPDATE (no output connections) and downstream node directly.

### Switch Condition Order: `failed` Must Be First

Failed items have no `stepType` field. If `failed` check is after step-type conditions, it never matches (undefined !== any type). Falls to fallback. During editing, `failed` condition got lost entirely. Always put `failed` at index 0.

### Condition Evaluator + Pre-Resolved Literals

Prepare Current Step resolves `{{overallScore}}` → `7` before condition handler. Handler gets `"7 >= 5"`, looks for key "7" in context → undefined → false. Fix: `coerceNumeric()` fallback for left operand.

### JSONB Double-Encode

`supabaseRequest()` does `req.write(JSON.stringify(body))`. If `output_payload` is already `JSON.stringify()`'d, PostgREST stores string-in-string. Fix: pass objects directly.

## MiniMax Agent Subworkflow

Reusable Claude API wrapper (workflow ID: `xaU50vf4eiNTeqSf`). Any workflow needing AI calls `executeWorkflow` here — never calls Claude directly.

**Credential:** `MiniMax` (Anthropic credential, LangChain node) — handles `anthropic-version` headers automatically.

**Output:** `content[].type === 'text'` — NOT `content[0]` (that's `thinking` type). Strip markdown code fences before `JSON.parse()`.

**Callers:** Survey Response AI Analysis, Workflow Orchestrator (via AI Action Handler)

## Workflow Orchestrator

**File:** `n8n-workflows/workflows/Workflows/Workflow Orchestrator.json`

Receives `{ workflowId, tenantId, triggerPayload }` from CMS → fetches definition from Supabase → topological sort → SplitInBatches loop → dispatches each step to handler subworkflow → writes state directly to Supabase.

**State management:** `$getWorkflowStaticData('global')` — initialized in Fetch and Initialize, read in Prepare Current Step, written in Process Step Result.

**Route by Step Type:** 9 outputs — failed(0), __skipped__(1), send_email(2), ai_action(3), webhook(4), condition(5), delay(6), trigger_types(7, OR), fallback(8).

**Trigger steps as real steps:** Not filtered out. Execute via Trigger Handler which fetches real data from Supabase (survey answers, appointments).

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
