# N8n Survey Analysis - Quick Start Guide

**Time Required:** 2-3 hours (first-time setup)

This is a condensed, action-oriented version of the full setup guide. For detailed explanations, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

---

## Prerequisites (5 minutes)

Gather these before starting:

### 1. Anthropic API Key
```
Login: https://console.anthropic.com/
Go to: Settings → API Keys → Create Key
Copy: sk-ant-... (save for Step 2)
```

### 2. Supabase Credentials
```
Login: Supabase Dashboard
Go to: Project Settings → API
Copy:
  - Host: xxx.supabase.co (extract from Project URL)
  - Service Role Key: eyJhbG... (NOT anon key)
```

### 3. GlitchTip DSN (Optional)
```
Pre-configured: https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1
(no action needed)
```

---

## Step 1: Configure Credentials (15 minutes)

### 1.1 Anthropic API

```
n8n UI → Settings → Credentials → Add Credential
Search: "HTTP Header Auth"
Configure:
  Name: Anthropic API
  Header Name: x-api-key
  Header Value: [YOUR_ANTHROPIC_API_KEY]
Save
```

### 1.2 Supabase

```
n8n UI → Settings → Credentials → Add Credential
Search: "Supabase"
Configure:
  Name: Halo-Efekt Supabase
  Host: [PROJECT_ID].supabase.co
  Service Role Secret: [YOUR_SERVICE_ROLE_KEY]
Test → Save
```

### 1.3 GlitchTip

```
n8n UI → Settings → Credentials → Add Credential
Search: "Sentry"
Configure:
  Name: GlitchTip Halo-Efekt
  DSN: https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1
Save
```

---

## Step 2: Import Workflow (10 minutes)

### 2.1 Import

```
n8n UI → Workflows → Add Workflow
Click ⋮ (three dots) → Import from File
Select: survey-analysis-workflow.json
Workflow opens in editor
```

### 2.2 Connect Credentials

For each node, select the credential you created:

**Supabase - Fetch Survey:**
```
Click node → Credential dropdown → Halo-Efekt Supabase
```

**Claude Haiku Analysis:**
```
Click node → Credential dropdown → Anthropic API
Verify headers:
  - anthropic-version: 2023-06-01
  - content-type: application/json
```

**Supabase - Update Response:**
```
Click node → Credential dropdown → Halo-Efekt Supabase
```

**Sentry - Error Log:**
```
Click node → Credential dropdown → GlitchTip Halo-Efekt
```

### 2.3 Save & Activate

```
Click "Save" (top right)
Toggle "Active" to ON
Note webhook URL: https://n8n.trustcode.pl/webhook/survey-analysis
```

---

## Step 3: Get Test Data (10 minutes)

Run these SQL queries in Supabase:

### 3.1 Get Survey Info

```sql
SELECT id as survey_id, tenant_id, title
FROM surveys
WHERE deleted_at IS NULL
LIMIT 1;
```

**Save:** survey_id, tenant_id

### 3.2 Get Question UUIDs

```sql
SELECT x.id as question_id, x.question
FROM jsonb_to_recordset(
  (SELECT questions FROM surveys WHERE id = '[SURVEY_ID_FROM_3.1]')
) AS x(id text, question text, "order" int)
ORDER BY x."order";
```

**Save:** First 3 question_ids

### 3.3 Get Response ID

```sql
SELECT id as response_id
FROM responses
WHERE survey_id = '[SURVEY_ID_FROM_3.1]'
  AND ai_qualification IS NULL
LIMIT 1;
```

**Save:** response_id

---

## Step 4: Test Workflow (30 minutes)

### 4.1 Test in N8n UI

**In n8n:**
```
1. Click "Execute Workflow"
2. Click "Webhook" node → "Listen for Test Event"
3. Keep n8n window open
```

**In terminal:**
```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID_FROM_3.3]",
    "surveyId": "[SURVEY_UUID_FROM_3.1]",
    "tenant_id": "[TENANT_UUID_FROM_3.1]",
    "answers": {
      "[QUESTION_UUID_1]": "Jan Kowalski",
      "[QUESTION_UUID_2]": "jan@test.pl",
      "[QUESTION_UUID_3]": "Sprawa rozwodowa z konfliktem majątkowym"
    }
  }'
```

**Watch n8n UI:** All nodes should turn green

### 4.2 Verify Database

```sql
SELECT
  id,
  status,
  ai_qualification->>'recommendation' as recommendation,
  ai_qualification->>'overall_score' as score,
  jsonb_pretty(ai_qualification) as analysis
FROM responses
WHERE id = '[RESPONSE_UUID_FROM_3.3]';
```

**Expected:**
- status: `qualified` or `disqualified`
- recommendation: `QUALIFIED`, `DISQUALIFIED`, or `NEEDS_MORE_INFO`
- score: numeric value (e.g., `7.2`)
- analysis: complete JSON object

### 4.3 Test Error Handling

**Invalid survey ID:**
```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[VALID_RESPONSE_UUID]",
    "surveyId": "00000000-0000-0000-0000-000000000000",
    "tenant_id": "[VALID_TENANT_UUID]",
    "answers": {}
  }'
```

**Expected:**
- Workflow fails at Supabase Fetch
- Check GlitchTip for error log

### 4.4 Test from External Source

**Outside n8n (real-world test):**
```bash
curl -v -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{ [SAME_PAYLOAD_AS_4.1] }'
```

**Expected:**
- HTTP 200 response
- n8n execution history shows new run
- Database updated

---

## Step 5: Monitor (10 minutes)

### 5.1 Check N8n Execution History

```
n8n UI → Executions tab
Look for:
  - Green checkmarks (success)
  - Execution time <10s
  - Success rate >95%
```

### 5.2 Check GlitchTip

```
Login: https://glitchtip.trustcode.pl/
Go to: Project #1
Should be empty if tests passed
```

### 5.3 Check Claude API Usage

```
Login: https://console.anthropic.com/
Go to: Dashboard → Usage
Verify:
  - API calls increasing
  - ~1400 tokens per request
  - ~$0.0008 cost per request
```

---

## Step 6: Production Deployment (Optional)

### 6.1 Website Integration

**File:** `apps/website/app/api/survey/submit/route.ts`

**Add after line 63:**
```typescript
// Trigger n8n AI analysis (fire-and-forget)
if (process.env.N8N_WEBHOOK_URL) {
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      responseId: responseData_inserted.id,
      surveyId: surveyId,
      tenant_id: surveyData.tenant_id,
      answers: answers
    })
  }).catch(err => console.error('[N8N] Failed:', err));
}
```

**Add to `.env.local`:**
```bash
N8N_WEBHOOK_URL=https://n8n.trustcode.pl/webhook/survey-analysis
```

**Add to Vercel:**
```
Vercel Dashboard → Settings → Environment Variables
Add: N8N_WEBHOOK_URL = https://n8n.trustcode.pl/webhook/survey-analysis
```

### 6.2 Test End-to-End

```
1. Submit real survey via website
2. Check n8n execution history (should show new run)
3. Query database to verify ai_qualification populated
4. Check GlitchTip for any errors
```

---

## Troubleshooting Quick Reference

| Issue | Check | Fix |
|-------|-------|-----|
| Webhook not responding | `curl -v [webhook-url]` | Activate workflow |
| Supabase 401 | Using service_role key? | Update credential |
| Claude 401 | API key format `sk-ant-...`? | Get new key |
| No AI results | Check n8n execution history | View node outputs |
| Database not updated | Run verification SQL | Check responseId matches |
| Sentry not firing | Error path connected? | Connect red line |

**Full guide:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Success Checklist

Before marking setup complete:

- [ ] All 3 credentials configured and tested
- [ ] Workflow imported and active
- [ ] Test in n8n UI passes (all nodes green)
- [ ] Database `ai_qualification` populated
- [ ] External curl test works
- [ ] Error test logged to GlitchTip
- [ ] Execution time <10 seconds
- [ ] Claude API usage visible
- [ ] No unexpected errors

---

## What's Next?

### Immediate
- Monitor first 100 executions
- Review 10 random AI analyses manually
- Check cost projection in Anthropic Console

### This Week
- Integrate with website API (Step 6.1)
- Create CMS UI for displaying results
- Set up GlitchTip email alerts

### Next Sprint
- Add email notifications for qualified leads
- Create manual re-trigger button in CMS
- A/B test prompt variations

---

## Command Cheat Sheet

**Test workflow:**
```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{ "responseId": "...", "surveyId": "...", "tenant_id": "...", "answers": {...} }'
```

**Verify database:**
```sql
SELECT id, status, ai_qualification->>'recommendation', jsonb_pretty(ai_qualification)
FROM responses WHERE id = '[UUID]';
```

**Check stats:**
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) as analyzed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) / COUNT(*), 1) as pct
FROM responses;
```

**Reset for re-test:**
```sql
UPDATE responses
SET ai_qualification = NULL, status = 'new'
WHERE id = '[UUID]';
```

---

## Documentation Index

| Need | Document |
|------|----------|
| **Quick setup** | QUICK_START.md (this file) |
| **Detailed setup** | SETUP_GUIDE.md |
| **Test commands** | TEST_COMMANDS.md |
| **SQL helpers** | test-data-queries.sql |
| **Debug issues** | TROUBLESHOOTING.md |
| **Visual diagrams** | WORKFLOW_DIAGRAM.md |
| **Full overview** | README.md |
| **Implementation summary** | IMPLEMENTATION_SUMMARY.md |

---

## Support

**If stuck:**
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for your error
2. Review n8n execution history (click failed node)
3. Test credentials (Settings → Credentials → Test)
4. Run SQL queries from [test-data-queries.sql](./test-data-queries.sql)
5. Check GlitchTip for error context

**Resources:**
- N8n Docs: https://docs.n8n.io/
- Anthropic API: https://docs.anthropic.com/
- Supabase Docs: https://supabase.com/docs

---

**Total Time:** 2-3 hours (first-time setup)
**Status:** Production-ready
**Next Action:** Start with Step 1 (Configure Credentials)
