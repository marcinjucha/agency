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

### Anthropic API Version Header Required

**Problem:** Claude API returns 400 Bad Request with unhelpful message.

**Root cause:** Missing `anthropic-version` header (n8n HTTP node doesn't add automatically).

**Fix:**
```json
{
  "headers": {
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  }
}
```

**Why easy to miss:** Claude API docs mention header, but not as REQUIRED (looks optional).

**Symptom without header:**
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Missing required parameter"
  }
}
```

**Impact:** 45 minutes debugging before finding missing header in network inspector.

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
WEBHOOK_URL=https://n8n.trustcode.pl  # N8n itself
EXECUTIONS_MODE=queue                  # CRITICAL for async
QUEUE_BULL_REDIS_HOST=redis
N8N_ENCRYPTION_KEY=[generated]         # openssl rand -hex 32
```

**Credentials Required:**
1. **Anthropic API** (HTTP Header Auth)
   - Header: `x-api-key`
   - Value: `sk-ant-...`

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
