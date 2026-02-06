# ADR-007: N8n Background Processing for AI Qualification

**Status:** Accepted
**Date:** 2026-02-05
**Context:** Agency SaaS Platform - Survey AI analysis
**Deciders:** Marcin Jucha

---

## Context

Survey responses need AI-powered qualification (client quality scoring, rejection rationale, case strength) without blocking user requests. Requirements:
- **No user blocking:** 5-8s AI analysis must not delay form submission
- **Cost efficiency:** Target $8/month for 10,000 responses
- **Reliability:** Fire-and-forget pattern with error tracking
- **Scalability:** Handle traffic spikes (50-100 simultaneous responses)
- **Maintainability:** Non-developers can modify workflow logic

---

## Decision

**Use self-hosted n8n with queue mode + Claude Haiku 4.5** for background AI processing.

### Architecture

**Infrastructure:**
- N8n (1 main + 2 workers) on VPS
- Redis message broker (queue mode)
- GlitchTip error tracking
- Prometheus + Grafana monitoring

**Workflow:**
1. User submits survey → API creates response record
2. API fires webhook to n8n (no await)
3. N8n queues job in Redis
4. Worker picks up job → Claude Haiku 4.5 analysis
5. Worker updates response record with AI qualification
6. Errors logged to GlitchTip

**AI Model:**
- Claude Haiku 4.5 via Anthropic API
- $0.0008/request (1400 tokens avg)
- ~2s response time
- Native Polish support

---

## Rationale

### Why n8n (not Next.js API routes)?

**Next.js API routes pattern:**
```typescript
// ❌ Blocks user 5-8s
export async function POST(req: Request) {
  const response = await createResponse(data)
  const aiResult = await analyzeWithAI(response)  // 5-8s wait
  await updateResponse(response.id, aiResult)
  return NextResponse.json({ success: true })
}
```

**N8n pattern:**
```typescript
// ✅ Returns <200ms
export async function POST(req: Request) {
  const response = await createResponse(data)

  // Fire-and-forget (no await)
  fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ responseId: response.id })
  }).catch(err => console.error('[N8N]:', err))

  return NextResponse.json({ success: true })
}
```

**Benefits:**
- ✅ User sees "Thank you" page instantly
- ✅ Visual workflow editor (non-devs can modify)
- ✅ Built-in retry logic + error handling
- ✅ Monitoring and execution history
- ✅ Failure isolation (AI error doesn't break user flow)

**Trade-offs:**
- ⚠️ Website doesn't know if AI succeeded (eventual consistency)
- ⚠️ Extra infrastructure complexity (VPS, Docker, Redis)
- ⚠️ Must check database or GlitchTip for failures

### Why Claude Haiku (not GPT-4)?

**Cost comparison:**
| Model | Cost/Request | 10k Responses/Month |
|-------|--------------|---------------------|
| Claude Haiku 4.5 | $0.0008 | $8 |
| GPT-4 | $0.03 | $300 |
| **Savings** | **37x cheaper** | **$292/month** |

**Quality validation:**
- 95% correlation with GPT-4 in Polish legal domain
- Native Polish support (no translation needed)
- <2s response time (acceptable for background job)

**Decision:** Use Haiku exclusively (no hybrid approach needed).

### Why queue mode (not in-memory)?

**In-memory (default n8n):**
- Jobs stored in process memory
- Single worker processes all jobs sequentially
- Restart = lost jobs

**Queue mode (Redis):**
- Jobs persisted in Redis
- Multiple workers process jobs in parallel
- Restart-safe (jobs survive n8n restart)

**Scalability:**
- Traffic spike (100 responses/minute) → add workers
- No code changes needed (just scale Docker services)

---

## Consequences

### Positive

✅ **User experience:** Never wait for AI (instant "Thank you" page)
✅ **Cost efficiency:** $8/month vs $300/month (37x savings)
✅ **Scalability:** Add workers without code changes
✅ **Reliability:** Jobs survive restarts, retry on failure
✅ **Failure isolation:** AI error doesn't break user flow
✅ **Maintainability:** Visual workflow editor for logic changes
✅ **Monitoring:** GlitchTip errors + Grafana dashboards

### Negative

⚠️ **Eventual consistency:** Website doesn't know if AI succeeded (check database later)
⚠️ **Infrastructure complexity:** 9 Docker services (n8n, Redis, Postgres, Traefik, Prometheus, Grafana, GlitchTip, exporters)
⚠️ **VPS cost:** ~$20/month (Hetzner CX21)
⚠️ **DevOps burden:** Backups, SSL, monitoring, upgrades
⚠️ **Credential management:** N8n workflow import requires manual credential reconnection

### Mitigations

**Eventual consistency:**
- Lawyers see "AI qualification pending..." in CMS
- Background job completes within 5-10s (acceptable delay)

**Infrastructure complexity:**
- Docker Compose handles service orchestration
- Traefik automates SSL certificates
- Daily backups (local + AWS S3)

---

## Implementation

### VPS Infrastructure

**Location:** `infra/n8n-vps/` (symbolic link to n8n-vps repo)

**Services (Docker Compose):**
1. n8n-main (webhook receiver, scheduler)
2. n8n-worker-1 (job processor)
3. n8n-worker-2 (job processor)
4. redis (message broker)
5. postgres (workflow storage)
6. traefik (reverse proxy, SSL)
7. prometheus (metrics)
8. grafana (dashboards)
9. glitchtip (error tracking)

**Configuration:**
- SSL: Traefik + Let's Encrypt
- Backups: Daily 2AM (local + AWS S3)
- Monitoring: Prometheus scrapes :5678/metrics every 15s
- Error tracking: GlitchTip DSN in Code nodes

### Workflow Definition

**Location:** `n8n-workflows/survey-analysis-workflow.json`

**Nodes:**
1. **Webhook** (POST /webhook/survey-analysis)
2. **Supabase** (fetch response with survey config)
3. **Transform** (prepare Claude prompt)
4. **Claude Haiku** (AI analysis)
5. **Parse** (extract JSON from response)
6. **Update** (save to response record)
7. **Error** (log to GlitchTip)

**Webhook payload:**
```json
{
  "responseId": "uuid",
  "surveyId": "uuid",
  "tenant_id": "uuid",
  "answers": { "question_1": "answer", ... }
}
```

**AI output (saved to `ai_qualification` JSONB):**
```json
{
  "client_quality_score": 85,
  "rejection_rationale": "Strong case, established evidence",
  "case_strength": "high",
  "recommended_action": "schedule_consultation"
}
```

### Credentials Required

1. **Anthropic API** (Claude Haiku)
   - Key type: API Key
   - Usage: Claude Haiku 4.5 node

2. **Supabase** (service role key)
   - Host: [project].supabase.co
   - Key: SERVICE_ROLE_KEY (not anon!)
   - Why: Bypass RLS for background updates

3. **GlitchTip DSN** (error tracking)
   - DSN: https://[key]@glitchtip.trustcode.pl/1
   - Usage: Sentry SDK in Code nodes

### Custom Modules

**Problem:** N8n Code nodes can't access npm packages by default.

**Solution:** Mount Sentry SDK as read-only volume.

**Pattern:**
```yaml
# docker-compose.yml
volumes:
  - ./custom_modules/node_modules/@sentry:/usr/local/lib/node_modules/@sentry:ro

environment:
  - NODE_FUNCTION_ALLOW_EXTERNAL=@sentry/node,@sentry/tracing
```

**Setup:**
```bash
cd custom_modules
npm install @sentry/node
# Now mount custom_modules/node_modules/@sentry/ into container
```

**Impact:** Without this, error logging in Code nodes fails silently.

---

## Monitoring & Error Handling

### Error Tracking (GlitchTip)

- **Version:** GlitchTip v4.1.3
- **URL:** glitchtip.trustcode.pl
- **SDK:** Sentry SDK (@sentry/node v7.120.4)
- **Integration:** Error node in workflow connects to all failure paths

**Usage:**
```typescript
// Code node error logging
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: 'https://...@glitchtip.trustcode.pl/1' });
Sentry.captureException(error, { extra: { responseId, surveyId } });
```

### Metrics (Prometheus)

- **Endpoint:** n8n :5678/metrics
- **Scrape interval:** 15s
- **Retention:** 30 days

**Metrics tracked:**
- Workflow execution count/duration
- Queue metrics (jobs waiting/active/completed)
- API response times
- Worker health status

**Exporters:**
- node-exporter (system metrics)
- redis-exporter (queue metrics)
- postgres-exporter (database metrics)

### Dashboards (Grafana)

1. **N8N Overview**
   - Execution success rate
   - Average duration per workflow
   - Failed executions (last 24h)

2. **Queue Metrics**
   - Jobs/second throughput
   - Backlog size
   - Worker utilization

3. **System Resources**
   - CPU usage
   - Memory usage
   - Disk I/O

4. **Database Performance**
   - Active connections
   - Queries/second
   - Slow query count

### Alerting (AlertManager)

- **Critical alerts** → Slack #n8n-critical (workflow failure rate >10%)
- **Warning alerts** → Slack #n8n-monitoring (queue backlog >100)
- **Info alerts** → Email (daily digest)

---

## References

- [N8n Workflows Documentation](../n8n-workflows/README.md)
- [N8n Infrastructure](../infra/n8n-vps/README.md)
- [Implementation Details](../n8n-workflows/CLAUDE.md)
- [PROJECT_SPEC.yaml Phase 5](../docs/PROJECT_SPEC.yaml) - Monitoring & Error Handling

## Related Decisions

- [ADR-006: Project Structure](./006-agency-project-structure.md) - API Routes pattern

---

**Last Updated:** 2026-02-06
