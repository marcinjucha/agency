# N8n Workflows for Legal-Mind

This directory contains n8n workflow definitions for automating business processes in Legal-Mind.

---

## Overview

**N8n Instance:** `https://n8n.trustcode.pl/`

**Purpose:** Automate backend processes that don't belong in the Next.js application:
- AI analysis of survey responses
- Scheduled tasks and cron jobs
- External API integrations
- Background processing

---

## Available Workflows

### 1. Survey Response AI Analysis

**File:** `survey-analysis-workflow.json`

**Purpose:** Analyze incoming survey responses using Claude Haiku 4.5 and save qualification scores to database.

**Trigger:** Webhook POST to `/webhook/survey-analysis`

**Input:**
```json
{
  "responseId": "uuid",
  "surveyId": "uuid",
  "tenant_id": "uuid",
  "answers": { "question-uuid": "answer" }
}
```

**Output:** Updates `responses.ai_qualification` (JSONB) with:
- Urgency score (0-10)
- Complexity score (0-10)
- Value score (0-10)
- Success probability (0-10)
- Overall score (weighted average)
- Summary (1-2 sentences)
- Recommendation (QUALIFIED/DISQUALIFIED/NEEDS_MORE_INFO)
- Notes for lawyer (3 key points)

**Cost:** ~$0.0008 per response
**Execution time:** 5-8 seconds

**Setup:** See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
**Testing:** See [TEST_COMMANDS.md](./TEST_COMMANDS.md)

---

## Quick Start

### For First-Time Setup

1. **Configure Credentials** (one-time):
   - Anthropic API key
   - Supabase service role key
   - GlitchTip DSN (optional)

2. **Import Workflow:**
   ```bash
   # In n8n UI:
   # Workflows → Add Workflow → Import from File
   # Select: survey-analysis-workflow.json
   ```

3. **Test:**
   ```bash
   curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

---

## For Developers

### Adding New Workflows

1. **Create workflow in n8n UI**
2. **Export workflow:**
   - Click three dots (⋮) → Export Workflow
   - Save as `workflow-name.json`
3. **Add to this directory**
4. **Document:**
   - Update this README
   - Add test commands to TEST_COMMANDS.md
   - Add setup instructions if needed

### Workflow Naming Convention

- File: `kebab-case-name.json`
- Workflow name in n8n: `Title Case Name`
- Webhook path: `/webhook/kebab-case-name`

Example:
- File: `email-notification.json`
- Name: `Email Notification`
- Path: `/webhook/email-notification`

### Best Practices

1. **Use Service Role Keys** for database access (bypasses RLS)
2. **Add Error Handling** with Sentry node (logs to GlitchTip)
3. **Set Timeouts** appropriately (default: 30s for API calls)
4. **Use Retry Logic** for external APIs (3 retries, 5s delay)
5. **Fire-and-Forget** for webhooks from website (don't block user requests)
6. **Document Expected Payloads** in workflow description

---

## Integration with Next.js Apps

### Website API Integration

**File:** `apps/website/app/api/survey/submit/route.ts`

```typescript
// After response insertion, trigger n8n workflow
if (process.env.N8N_WEBHOOK_URL) {
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responseId, surveyId, tenant_id, answers })
  }).catch(err => console.error('[N8N] Failed:', err));
}
```

**Environment Variable:**
```bash
N8N_WEBHOOK_URL=https://n8n.trustcode.pl/webhook/survey-analysis
```

Add to:
- `.env.local` (local dev)
- `.env.local.example` (documentation)
- Vercel → Settings → Environment Variables (production)

### CMS Integration (Future)

Display AI analysis results:

**File:** `apps/cms/features/surveys/components/ResponseDetail.tsx`

```tsx
{response.ai_qualification && (
  <div className="ai-analysis">
    <h3>AI Analysis</h3>
    <div className="scores">
      <Score label="Overall" value={response.ai_qualification.overall_score} />
      <Score label="Urgency" value={response.ai_qualification.urgency_score} />
      {/* ... */}
    </div>
    <p>{response.ai_qualification.summary}</p>
    <ul>
      {response.ai_qualification.notes_for_lawyer.map(note => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  </div>
)}
```

---

## Monitoring

### N8n Execution History

**Location:** n8n UI → Executions tab

**Metrics to Watch:**
- Success rate (target: >95%)
- Execution time (target: <10s per workflow)
- Error patterns (check failed executions)

### GlitchTip Error Tracking

**Location:** `https://glitchtip.trustcode.pl/`

**What to Monitor:**
- Workflow failures (Sentry node fires)
- API connection issues
- Database errors

### Claude API Usage

**Location:** `https://console.anthropic.com/`

**Metrics:**
- API calls per day
- Token usage per request (~1400 tokens)
- Cost per request (~$0.0008)
- Monthly spend

### Database Checks

```sql
-- Check AI analysis coverage
SELECT
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) as analyzed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) / COUNT(*), 1) as coverage_pct
FROM responses;

-- Check analysis results distribution
SELECT
  ai_qualification->>'recommendation' as recommendation,
  COUNT(*) as count,
  ROUND(AVG((ai_qualification->>'overall_score')::numeric), 2) as avg_score
FROM responses
WHERE ai_qualification IS NOT NULL
GROUP BY recommendation;
```

---

## Credentials Management

### Where Stored

All credentials are stored in n8n (not in code):
- Settings → Credentials
- Encrypted at rest
- Access restricted to n8n instance

### Required Credentials

1. **Anthropic API** (HTTP Header Auth)
   - Header: `x-api-key`
   - Value: `sk-ant-...`
   - Used in: Survey Analysis workflow

2. **Legal-Mind Supabase** (Supabase credential)
   - Host: `[project].supabase.co`
   - Service Role Key: `eyJhb...`
   - Used in: All workflows with database access

3. **GlitchTip Legal-Mind** (Sentry credential)
   - DSN: `https://...@glitchtip.trustcode.pl/1`
   - Used in: Error logging nodes

### Credential Rotation

When rotating credentials:
1. Update in n8n UI (Settings → Credentials)
2. Test affected workflows
3. No code changes needed

---

## Troubleshooting

### Common Issues

**Issue:** Workflow not executing
- Check: Workflow is Active (toggle in n8n)
- Check: Webhook URL is correct
- Test: `curl -v [webhook-url]` should return 405 (only POST allowed)

**Issue:** Database connection fails
- Check: Using service_role key (not anon)
- Check: Supabase host format (no `https://`)
- Test: Credential → Test Connection

**Issue:** Claude API fails
- Check: API key format (`sk-ant-...`)
- Check: Header name is `x-api-key`
- Check: `anthropic-version: 2023-06-01` header present
- Test: API key in Anthropic Console

**Issue:** No errors in GlitchTip
- Check: Sentry node connected to error path (red line)
- Check: DSN is correct
- Test: Force error and verify logging

### Debug Process

1. **Check n8n execution history** (Executions tab)
2. **Click failed execution** to see error details
3. **Inspect node outputs** (click node → Output tab)
4. **Review GlitchTip** for error context
5. **Test credentials** (Settings → Credentials → Test)

---

## Architecture Decisions

### Why n8n (not Next.js API routes)?

**Separation of Concerns:**
- Next.js: User-facing features (fast response times)
- n8n: Background processing (can take seconds)

**Benefits:**
- No blocking user requests (fire-and-forget)
- Visual workflow editor (non-devs can modify)
- Built-in retry logic and error handling
- Monitoring and execution history
- Easy to add scheduled tasks (cron)

### Why Claude Haiku (not GPT-4)?

**Cost-Effectiveness:**
- Haiku: $0.0008/request (1400 tokens)
- GPT-4: $0.03/request (same tokens)
- 37x cheaper for same task

**Performance:**
- Response time: <2s for analysis
- Quality: Sufficient for scoring (0-10 scale)
- Polish language support: Native

**Future:** Can A/B test with Claude Sonnet if quality issues arise

### Why JSONB (not separate tables)?

**Flexibility:**
- AI output schema can evolve without migrations
- Easy to add new fields (model version, confidence scores)
- No foreign key constraints

**Query Performance:**
- Can index JSONB fields (`CREATE INDEX ON responses USING GIN (ai_qualification)`)
- Can query specific fields (`ai_qualification->>'recommendation'`)
- Atomic updates (no transaction complexity)

---

## Roadmap

### Phase 1 (Current)
- [x] Survey AI analysis workflow
- [ ] Website API integration
- [ ] CMS display of AI results

### Phase 2 (Future)
- [ ] Email notifications based on qualification
- [ ] Scheduled batch processing (analyze old responses)
- [ ] Manual re-trigger button in CMS
- [ ] A/B test prompt variations

### Phase 3 (Ideas)
- [ ] Slack notifications for high-value leads
- [ ] Calendar integration (auto-schedule consultations)
- [ ] Client follow-up reminders (cron job)
- [ ] Analytics dashboard (n8n → Metabase)

---

## Contributing

When adding or modifying workflows:

1. **Test thoroughly** using TEST_COMMANDS.md
2. **Document changes** in this README
3. **Export workflow JSON** and commit to repo
4. **Update SETUP_GUIDE.md** if credentials change
5. **Add test commands** to TEST_COMMANDS.md

---

## Support Resources

- **N8n Docs:** https://docs.n8n.io/
- **Anthropic API:** https://docs.anthropic.com/
- **Supabase Docs:** https://supabase.com/docs
- **GlitchTip:** https://glitchtip.com/documentation

---

## Version History

### v1.0.0 (2026-02-04)
- Initial workflow: Survey Response AI Analysis
- Claude Haiku 4.5 integration
- Supabase database updates
- GlitchTip error logging

---

**Maintainer:** Marcin Jucha
**Last Updated:** 2026-02-04
