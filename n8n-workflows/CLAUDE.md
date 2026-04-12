# N8n Workflows - AI Survey Analysis

Background processing for AI-powered survey qualification using Claude Haiku 4.5.

## The Weird Parts

### Custom Modules Mount (Sentry SDK)

**Why:** Code nodes in n8n can't access npm packages by default. Need to mount external modules as read-only volume.

**Pattern:**
```yaml
# docker-compose.yml
volumes:
  - ./custom_modules/node_modules/@sentry:/usr/local/lib/node_modules/@sentry:ro

environment:
  - NODE_FUNCTION_ALLOW_EXTERNAL=@sentry/node,@sentry/tracing
```

**Critical:** Must install modules OUTSIDE container, then mount:
```bash
cd custom_modules
npm install @sentry/node
# Now modules exist in custom_modules/node_modules/@sentry/
# Mount this path into container
```

**Why not install inside container?** N8n official image doesn't persist npm installs. Must mount from host.

**Impact:** Without this, Sentry error logging in Code nodes fails silently (no error, no logs).

### Credential IDs Don't Survive Import

**Why:** N8n workflow JSON contains credential IDs like `{{SUPABASE_CREDENTIAL_ID}}`. These are workspace-specific.

**Problem:** Import workflow → credentials broken → nodes show red error icons.

**Fix Pattern (manual, EVERY time):**
1. Import workflow JSON
2. Click EACH node with credentials
3. Select credential from dropdown (reconnect manually)
4. Save workflow

**Time cost:** ~5 minutes per workflow, unavoidable.

**Alternative considered:** Environment variables for credentials → rejected (n8n doesn't support this pattern).

### Service Role Key Required (Not Anon)

**Why:** Workflow needs to update `responses.ai_qualification` which has RLS policy blocking anonymous updates.

**Code:**
```typescript
// Supabase node configuration
Credential: "Halo-Efekt Supabase"
Host: "[project].supabase.co"
Key: SERVICE_ROLE_KEY  // ← Not anon key!
```

**Mistake made:** Using anon key → 401 Unauthorized on UPDATE query.

**Fix:** Use service role key (bypasses RLS, safe because tenant_id validated in webhook).

**Impact:** Without service role key, workflow completes but database never updates (silent failure).

### Fire-and-Forget Webhook Pattern

**Why:** Don't block user requests waiting for AI analysis (5-8 seconds).

**Pattern:**
```typescript
// Website API route (future integration)
fetch(process.env.N8N_WEBHOOK_URL, {
  method: 'POST',
  body: JSON.stringify({ responseId, surveyId, tenant_id, answers })
}).catch(err => console.error('[N8N] Failed:', err))
// ↑ No await, no response handling
```

**Trade-offs:**
- ✅ User sees "Thank you" page instantly
- ✅ AI failure doesn't break user flow
- ❌ Website doesn't know if AI analysis succeeded
- ❌ Must check database or GlitchTip for failures

**Why acceptable:** AI qualification is enhancement, not required feature. Lawyers can manually review responses even without AI scores.

### Claude Haiku vs GPT-4 Cost Math

**Decision:** Use Claude Haiku 4.5 exclusively (not hybrid approach).

**Cost comparison:**
- Claude Haiku: $0.0008/request (1400 tokens avg)
- GPT-4: $0.03/request (same tokens)
- **37x cheaper**

**At scale (10,000 responses/month):**
- Haiku: $8/month
- GPT-4: $300/month
- **Savings: $292/month**

**Why not hybrid?** Original plan: GPT-4 for quick analysis, Claude for summaries. Testing showed Haiku alone sufficient for both → simplified to single model.

## Critical Mistakes We Made

### Queue Mode Not Obvious

**Problem:** Default n8n config runs workflows in-memory (blocks main instance).

**Symptom:** Webhook responds slowly (5-8s) → user sees spinner → bad UX.

**Root cause:** Workflow executes synchronously in main process → API blocks until complete.

**Fix:** Enable queue mode with Redis:
```yaml
environment:
  - EXECUTIONS_MODE=queue
  - QUEUE_BULL_REDIS_HOST=redis
```

**How queue mode works:**
1. Webhook receives request → enqueues job → responds instantly (100ms)
2. Worker picks job from Redis queue → executes workflow → updates database
3. User never waits for AI analysis

**Impact:** Response time improved from 5-8s → <200ms (perceived as instant).

**Time wasted:** 2 hours debugging "slow webhooks" before discovering queue mode.

### GlitchTip vs Sentry Naming

**Problem:** Documentation says "Sentry node" but GlitchTip is self-hosted Sentry alternative.

**Confusion:** "Do I need Sentry cloud account?" → No, use GlitchTip (already deployed on VPS).

**Clarification:**
- **Sentry node** = n8n node type (generic error logger)
- **GlitchTip** = Sentry-compatible backend (receives errors)
- **Sentry SDK** = Client library (@sentry/node in Code nodes)

**All compatible:** Sentry SDK sends to GlitchTip backend using Sentry protocol.

**DSN format same:**
```
https://[key]@glitchtip.trustcode.pl/[project_id]
```

**Time wasted:** 30 minutes reading Sentry cloud docs before realizing GlitchTip already exists.

### ~~Anthropic API Version Header Required~~ [OBSOLETE — MiniMax Agent uses LangChain node]

**Why obsolete:** We no longer call Claude via HTTP node. All AI invocations go through the MiniMax Agent subworkflow which uses `@n8n/n8n-nodes-langchain.anthropic` — that node handles `anthropic-version` headers automatically.

**Why kept:** Shows what happened before MiniMax Agent was extracted. If you ever add a raw HTTP node calling Claude directly, this issue will resurface.

### JSONB Update Syntax Trap

**Problem:** Supabase node UPDATE fails with "column ai_qualification does not exist".

**Root cause:** JSONB column requires JSON string, not object.

**Wrong (fails):**
```json
{
  "ai_qualification": {
    "urgency_score": 8,
    "summary": "..."
  }
}
```

**Correct (works):**
```json
{
  "ai_qualification": "{{ JSON.stringify($json.qualification) }}"
}
```

**Why confusing:** Supabase client in JavaScript accepts objects (auto-converts). N8n node requires strings.

**Impact:** 20 minutes testing different formats before finding stringify solution.

## MiniMax Agent Subworkflow Pattern

**File:** `n8n-workflows/workflows/MiniMax Agent.json` (workflow ID: `xaU50vf4eiNTeqSf`)

Reusable subworkflow that wraps all AI invocations. Any workflow needing to call Claude uses `Execute Workflow` node pointing here — never calls Claude directly.

**Why extracted:** Before this, each workflow had its own Claude HTTP node with credentials, headers, model config. This duplicated config and caused the `anthropic-version` header issue. Now config lives in one place.

**How to call:**
```json
{
  "type": "n8n-nodes-base.executeWorkflow",
  "workflowId": "xaU50vf4eiNTeqSf"
}
```

Pass input data (mappingMode: `defineBelow`) with prompt and any context the node needs (e.g., `surveyTitle`, `qaContext`, `responseId`, `tenant_id`).

**Output:** `content[0].text` — Claude's raw text response. Caller is responsible for parsing (JSON extraction, error handling).

**Credential:** `MiniMax` (Anthropic credential, LangChain node) — NOT HTTP Header Auth. No need for `anthropic-version` header management.

**Current callers:**
- `Survey Response AI Analysis.json` — calls after building Q&A context, parses scored JSON from response
- `Workflow Orchestrator.json` — calls as `ai_action` branch inside the orchestrator's step dispatcher

**Adding new AI workflow:** Add `Execute Workflow` node → `xaU50vf4eiNTeqSf`. Do NOT add new Anthropic credential nodes or raw HTTP calls to Claude.

---

## Workflow Orchestrator (AAA-T-183 iter 7)

**File:** `n8n-workflows/workflows/Workflow Orchestrator.json` (21 nodes, ~700 lines)

This is the generic workflow execution engine. CMS no longer runs executor.ts — instead it POSTs `{ workflowId, triggerPayload }` to n8n and n8n does everything.

**Flow:**
1. Webhook receives `{ workflowId, triggerPayload }` from CMS trigger route
2. Reads workflow definition (steps + edges) directly from Supabase
3. Resolves step order (topological sort)
4. Dispatches each step to its type-specific subworkflow (send_email, webhook, ai_action, condition, delay)
5. Writes execution state (workflow_executions + workflow_step_executions) directly to Supabase — no CMS callback
6. Returns immediately (fire-and-forget); CMS polls for status via execution list UI

**Why n8n owns all execution now:** CMS executor.ts grew to 874 LOC handling orchestration, callbacks, resume, delay processing — all on Vercel serverless (5-10 min execution limit). N8n has native Wait node, Redis queue, retry logic, and no serverless timeout. Moving orchestration to n8n eliminated the callback route, resume route, and delay processor route entirely.

**Deleted from CMS:**
- `engine/executor.ts`, `engine/action-handlers.ts`, `engine/trigger-matcher.ts`
- `/api/workflows/callback`, `/api/workflows/resume`, `/api/workflows/process-due-delays`
- `claim_due_delay_steps()` RPC (migration: `20260411120000_drop_claim_due_delay_steps.sql`)

**Deleted n8n workflows:**
- `Workflow Action Executor.json` — replaced by Orchestrator's built-in step dispatcher
- `Workflow Delay Processor.json` — replaced by n8n native Wait node

**Payload contract (CMS → n8n):**
```json
{ "workflowId": "uuid", "triggerPayload": { ...trigger-specific fields } }
```

### Inline Supabase Fetches (Promise.all in Code Node)

Orchestrator uses a single "Fetch and Initialize" Code node with `supabaseRequest()` helper + `Promise.all()` for parallel fetches (workflow, steps, edges). Native Supabase nodes were reverted due to fan-in race conditions and unreliable filter expressions.

**Why Code node over native Supabase nodes:** (1) n8n fan-in fires downstream when ANY upstream completes, not ALL — causes `$('NodeName') hasn't been executed` errors. (2) Native Supabase node filter expressions (`$json.field`, `$('Node').first().json.field`) silently return all rows instead of filtered set. `Promise.all()` in JavaScript handles parallelism reliably.

**See also:** `.claude/skills/ag-n8n-step-handlers/SKILL.md` for the full `supabaseRequest()` boilerplate and handler patterns.

---

## Role in Workflow Engine Architecture

- **N8n = orchestrator (2026-04-11, AAA-T-183)** — N8n now owns ALL workflow execution: reads definition, dispatches steps, writes state, handles delays natively. CMS role reduced to: (1) UI canvas builder, (2) single trigger POST, (3) execution log viewer, (4) dry-run test mode. **WHY:** CMS executor on Vercel had a hard serverless timeout limit; n8n native Wait node handles multi-hour delays without polling or resume endpoints. Routing logic still configured via CMS UI but executed entirely by n8n.
- **Previous architecture (2026-03-29 to 2026-04-10):** N8n was execution layer only — CMS dispatched async steps to n8n and received callbacks. This was replaced by the Orchestrator pattern above.

## Gotchas (n8n Workflow Authoring)

### SplitInBatches MUST Have Loop-Back Connection

**Problem:** Without connection from last node back to SplitInBatches (output 0), only first item is processed. N8n completes without error — silent data loss.

**Why:** Found twice in AAA-T-157 (Token Refresh + Status Sync). Silent and hard to debug because n8n shows successful execution with no warnings.

**Fix:** Always wire last node in batch loop back to SplitInBatches output 0.

### Code Node onError Needs Explicit Error Output Wiring

**Problem:** Setting `onError: continueErrorOutput` is not enough. Must ALSO add error connection in connections JSON (output index 1 to error handler). Without wiring, errors fall to global errorWorkflow.

**Why:** CMS callback never fires without this — listing stuck in publishing state forever. The onError setting only enables the second output port, but n8n won't route errors there unless connections JSON explicitly maps output index 1 to a downstream node.

**Fix:** In workflow JSON, add connection from Code node output index 1 to your error handler node.

### CMS-n8n Payload Field Name Contract Must Match Exactly

**Problem:** CMS dispatch payload key names must match n8n Extract Payload node reads. Silent null if mismatch — n8n processes with empty data, no error.

**Why:** `publish_payload` vs `params` mismatch caused silent data loss in AAA-T-157. N8n expressions like `{{ $json.params }}` return `undefined` silently when the actual key is `publish_payload`.

**Fix:** Verify field names match between CMS `dispatchToN8n()` payload and n8n Set/Code node reads. No runtime validation exists — must be checked manually.

### n8n Supabase Node Default Operation is `create`

**Problem:** Without explicit `"operation": "getAll"`, Supabase node tries to INSERT filter values as new row. Causes NOT NULL constraint violations.

**Why:** Default operation for n8n Supabase node v1 is `create`, not `getAll`. Silent data corruption risk — filter values become column values for INSERT.

**Fix:** Always set `"operation": "getAll"` explicitly for read operations in workflow JSON.

### n8n Sandbox Lacks `URL` Constructor

**Problem:** `new URL()` throws `ReferenceError: URL is not defined` in Code nodes.

**Why:** n8n Code node runs in a sandboxed VM that doesn't expose Node.js globals like `URL`.

**Fix:** Use regex parsing: `url.match(/^https?:\/\/([^/]+)(\/.*)$/)` — `hostname = match[1]`, `path = match[2]`.

### n8n HTTP Request: specifyBody "string" for Nested Objects

**Problem:** `bodyParameters` can't handle nested payload objects in HTTP Request node.

**Fix:** Use `specifyBody: "string"` + `JSON.stringify()` for reliable nested object sending.

### Wait Node Works Inside SplitInBatches

n8n serializes execution state, so Wait (delay) inside a SplitInBatches loop works correctly — each batch waits, then continues. Non-obvious because you'd expect async state loss. Useful for rate-limited API calls.

---

## Quick Reference

**Key Facts:**
- Workflow webhook: `POST /webhook/survey-analysis`
- Model: `claude-haiku-4-5-20250710`
- Cost: ~$0.0008/analysis
- Execution time: 5-8s (async via queue)
- Storage: `responses.ai_qualification` (JSONB)
- Error tracking: GlitchTip (Sentry-compatible)
- Retry logic: 3 attempts, 5s delay
- Queue: Redis (max 256MB, LRU eviction)

**VPS Location:**
- Infrastructure: `infra/n8n-vps/` (symlink to n8n-vps repo)
- Workflow definitions: `n8n-workflows/` (project root)
- Documentation: 10 files, 112KB

**Environment Variables:**
```bash
N8N_WEBHOOK_URL=https://n8n.trustcode.pl/webhook/survey-analysis
N8N_WORKFLOW_ORCHESTRATOR_URL=https://n8n.trustcode.pl/webhook/workflow-orchestrator
WEBHOOK_URL=https://n8n.trustcode.pl  # N8n itself
EXECUTIONS_MODE=queue                  # CRITICAL for async
QUEUE_BULL_REDIS_HOST=redis
N8N_ENCRYPTION_KEY=[generated]         # openssl rand -hex 32
```

**Credentials Required:**
1. **MiniMax** (Anthropic LangChain credential) — used inside MiniMax Agent subworkflow
   - Type: `@n8n/n8n-nodes-langchain.anthropic`
   - Value: `sk-ant-...`
   - Note: LangChain node handles `anthropic-version` headers automatically

2. **Halo-Efekt Supabase** (Supabase credential)
   - Host: `[project].supabase.co`
   - Key: Service Role Key (NOT anon)

3. **GlitchTip Halo-Efekt** (Sentry credential)
   - DSN: `https://[key]@glitchtip.trustcode.pl/1`

**Testing Commands:**
```bash
# Test webhook (with real UUIDs from database)
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{"responseId":"...","surveyId":"...","tenant_id":"...","answers":{...}}'

# Check execution in n8n UI
# Executions tab → View latest run → Inspect node outputs

# Verify database update
psql> SELECT ai_qualification FROM responses WHERE id = '...';
```

**Common Errors:**
- `401 Unauthorized` → Using anon key instead of service role key
- `400 Bad Request (Claude)` → Missing `anthropic-version` header
- `Column ai_qualification does not exist` → Need `JSON.stringify()` for JSONB
- `Webhook timeout` → Queue mode not enabled (check EXECUTIONS_MODE=queue)
- `No errors in GlitchTip` → Sentry node not connected to error path

**Monitoring URLs:**
- N8n UI: `https://n8n.trustcode.pl/`
- GlitchTip: `https://glitchtip.trustcode.pl/`
- Grafana: `https://grafana.trustcode.pl/`
- Prometheus: `https://prometheus.trustcode.pl/`
