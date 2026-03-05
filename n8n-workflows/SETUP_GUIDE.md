# N8n Survey Analysis Workflow - Setup Guide

## Overview

This guide walks through setting up the **Survey Response AI Analysis** workflow in n8n at `https://n8n.trustcode.pl/`.

**Workflow Purpose:** Analyze survey responses using Claude Haiku 4.5 and save results to `responses.ai_qualification` (JSONB field).

**Estimated Setup Time:** 2-3 hours

---

## Prerequisites

Before starting, gather these credentials:

### 1. Anthropic API Key
- Login to https://console.anthropic.com/
- Navigate to Settings → API Keys
- Click "Create Key"
- Copy the key (format: `sk-ant-...`)
- **Save this key** - you'll need it in Step 2

### 2. Supabase Credentials
- Login to Supabase Dashboard
- Go to Project Settings → API
- Copy:
  - **Project URL:** Extract host from `https://xxx.supabase.co` → `xxx.supabase.co`
  - **Service Role Key:** (secret key, NOT anon key)
- **Save these values** - you'll need them in Step 2

### 3. GlitchTip DSN (Optional - for error logging)
- DSN: `https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1`
- Project ID: `1`
- Already configured, no action needed

---

## Step 1: Configure Credentials in n8n

### 1.1 Anthropic API Credential

1. Login to n8n at `https://n8n.trustcode.pl/`
2. Click Settings (gear icon) → Credentials
3. Click "Add Credential"
4. Search for "HTTP Header Auth"
5. Configure:
   - **Credential Name:** `Anthropic API`
   - **Name:** `x-api-key`
   - **Value:** `[YOUR_ANTHROPIC_API_KEY]` (from Prerequisites)
6. Click "Save"

### 1.2 Supabase Credential

1. In Credentials page, click "Add Credential"
2. Search for "Supabase"
3. Configure:
   - **Credential Name:** `Halo-Efekt Supabase`
   - **Host:** `[YOUR_PROJECT_ID].supabase.co` (from Prerequisites)
   - **Service Role Secret:** `[YOUR_SERVICE_ROLE_KEY]` (from Prerequisites)
4. Click "Test" to verify connection
5. Click "Save"

### 1.3 Sentry (GlitchTip) Credential

1. In Credentials page, click "Add Credential"
2. Search for "Sentry"
3. Configure:
   - **Credential Name:** `GlitchTip Halo-Efekt`
   - **DSN:** `https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1`
4. Click "Save"

---

## Step 2: Import Workflow

### 2.1 Import from JSON

1. In n8n, click "Workflows" → "Add Workflow"
2. Click the three dots menu (⋮) → "Import from File"
3. Select `survey-analysis-workflow.json` from this directory
4. Workflow will open in editor

### 2.2 Update Credential References

The imported workflow has placeholder credential IDs. You need to reconnect them:

**For each node that requires credentials:**

1. **Supabase - Fetch Survey** node:
   - Click the node
   - In "Credential" dropdown, select `Halo-Efekt Supabase`

2. **Claude Haiku Analysis** node:
   - Click the node
   - In "Credential" dropdown, select `Anthropic API`
   - Verify headers section shows:
     - `anthropic-version`: `2023-06-01`
     - `content-type`: `application/json`

3. **Supabase - Update Response** node:
   - Click the node
   - In "Credential" dropdown, select `Halo-Efekt Supabase`

4. **Sentry - Error Log** node:
   - Click the node
   - In "Credential" dropdown, select `GlitchTip Halo-Efekt`

### 2.3 Save Workflow

1. Click "Save" button (top right)
2. Name: `Survey Response AI Analysis` (should already be set)
3. Toggle "Active" switch to **ON**
4. Note the webhook URL: `https://n8n.trustcode.pl/webhook/survey-analysis`

---

## Step 3: Test the Workflow

### 3.1 Prepare Test Data

First, get real data from your Supabase database:

```sql
-- Get a survey ID
SELECT id, title FROM surveys LIMIT 1;

-- Get a response ID for that survey
SELECT id, survey_id, answers FROM responses WHERE survey_id = '[SURVEY_ID]' LIMIT 1;

-- Get tenant_id
SELECT tenant_id FROM surveys WHERE id = '[SURVEY_ID]';
```

### 3.2 Test in n8n UI (Recommended First)

1. In the workflow editor, click "Execute Workflow" button
2. Click on the "Webhook" node
3. Click "Listen for Test Event"
4. Open a terminal and run:

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "question-uuid-1": "Jan Kowalski",
      "question-uuid-2": "jan@test.pl",
      "question-uuid-3": "Chcę rozwodu"
    }
  }'
```

**Replace placeholders:**
- `[RESPONSE_UUID]` - from Step 3.1
- `[SURVEY_UUID]` - from Step 3.1
- `[TENANT_UUID]` - from Step 3.1
- `answers` object - use real question UUIDs and answers

5. Watch the execution in n8n UI (nodes will light up green)
6. Click each node to inspect output

**Expected Results:**
- ✅ Webhook receives payload
- ✅ Supabase fetches survey with questions array
- ✅ Transform creates prompt string
- ✅ Claude returns JSON with scores
- ✅ Parse extracts qualification object
- ✅ Supabase updates response

### 3.3 Verify Database Update

```sql
-- Check if ai_qualification was populated
SELECT
  id,
  status,
  ai_qualification->>'recommendation' as recommendation,
  ai_qualification->>'overall_score' as score,
  ai_qualification->>'summary' as summary,
  ai_qualification->>'analyzed_at' as analyzed_at
FROM responses
WHERE id = '[RESPONSE_UUID]';
```

**Expected Output:**
```
id                  | [uuid]
status              | qualified (or disqualified)
recommendation      | QUALIFIED (or DISQUALIFIED/NEEDS_MORE_INFO)
score               | 7.2 (numeric value)
summary             | Krótkie podsumowanie sprawy
analyzed_at         | 2026-02-04T10:30:00Z
```

### 3.4 Test Error Handling

**Test 1: Invalid Survey ID**

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

**Expected:** Workflow fails, Sentry node fires, error logged to GlitchTip

**Test 2: Empty Answers**

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[VALID_RESPONSE_UUID]",
    "surveyId": "[VALID_SURVEY_UUID]",
    "tenant_id": "[VALID_TENANT_UUID]",
    "answers": {}
  }'
```

**Expected:** Workflow succeeds, Claude handles missing answers gracefully

---

## Step 4: Production Testing

### 4.1 Test from External API (Real-World Scenario)

Once workflow is working in n8n UI, test from external source:

```bash
# Use curl from your terminal (outside n8n)
curl -v -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[question-uuid]": "Real answer here"
    }
  }'
```

**Check:**
- HTTP response code should be 200
- Response body should contain success message
- n8n execution history shows new run
- Database record updated

### 4.2 Monitor Execution History

1. Go to n8n → Executions tab
2. View recent executions
3. Green checkmark = success
4. Red X = failure (click to debug)

### 4.3 Monitor GlitchTip for Errors

1. Login to `https://glitchtip.trustcode.pl/`
2. Check Project #1 for error events
3. Should be empty if workflow is working correctly

---

## Step 5: Performance Verification

### 5.1 Check Execution Time

In n8n execution history:
- Click on a successful execution
- Check "Execution Time" in top bar
- **Target:** <10 seconds per response
- **Typical:** 5-8 seconds

### 5.2 Monitor Claude API Usage

1. Login to https://console.anthropic.com/
2. Go to Dashboard → Usage
3. Verify:
   - API calls increasing (1 per response)
   - Token usage ~1400 tokens per response
   - Cost ~$0.0008 per response

### 5.3 Database Performance

```sql
-- Check how many responses have been analyzed
SELECT
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) as analyzed,
  COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
  COUNT(*) FILTER (WHERE status = 'disqualified') as disqualified
FROM responses;
```

---

## Troubleshooting

### Issue: "Webhook not receiving requests"

**Symptoms:**
- curl returns connection refused
- n8n execution history is empty

**Solutions:**
1. Verify workflow is **Active** (toggle in top right)
2. Check webhook URL is correct: `https://n8n.trustcode.pl/webhook/survey-analysis`
3. Test with `curl -v` to see HTTP response details
4. Check n8n logs (if you have access to Docker/server logs)

---

### Issue: "Supabase connection failed"

**Symptoms:**
- Node shows error "Authentication failed"
- Execution fails at Supabase Fetch node

**Solutions:**
1. Verify you're using **service_role** key (not anon key)
2. Check Supabase host format: `xxx.supabase.co` (no `https://` prefix)
3. Test credential: Credentials → Halo-Efekt Supabase → Test
4. Check Supabase project is active (not paused)

---

### Issue: "Claude API returns 401 Unauthorized"

**Symptoms:**
- HTTP Request node fails with 401
- Error message mentions authentication

**Solutions:**
1. Verify API key format: should start with `sk-ant-`
2. Check header name is `x-api-key` (not `Authorization`)
3. Verify `anthropic-version` header is `2023-06-01`
4. Test API key in Anthropic Console (try to create a chat)
5. Check API key hasn't expired or been revoked

---

### Issue: "Claude returns invalid JSON"

**Symptoms:**
- Parse node fails to extract qualification
- ai_qualification contains error field

**Solutions:**
1. Check Parse node output - look for `raw_response` field
2. Review prompt in Transform node - ensure instructions are clear
3. Increase `max_tokens` if response is being cut off (current: 1000)
4. Adjust `temperature` if responses are too random (current: 0.3)
5. Check if Polish language is causing issues (Claude Haiku supports Polish)

---

### Issue: "Database update fails"

**Symptoms:**
- Supabase Update node fails
- Error mentions RLS or permissions

**Solutions:**
1. Verify using **service_role** key (bypasses RLS)
2. Check response UUID exists in database
3. Verify tenant_id is valid
4. Check RLS policies on `responses` table (should allow service role)
5. Test manual update in Supabase UI:
   ```sql
   UPDATE responses
   SET ai_qualification = '{"test": true}'::jsonb
   WHERE id = '[RESPONSE_UUID]';
   ```

---

### Issue: "Sentry errors not appearing in GlitchTip"

**Symptoms:**
- Workflow fails but no error in GlitchTip
- Sentry node not firing

**Solutions:**
1. Check Sentry node is connected to error path (red line from previous node)
2. Verify DSN is correct in credential
3. Test manual event:
   - Execute workflow
   - Force an error (invalid survey ID)
   - Check GlitchTip dashboard
4. Check GlitchTip project is active

---

## Success Criteria Checklist

Before considering setup complete, verify:

- [ ] All 3 credentials configured and tested
- [ ] Workflow imported and saved
- [ ] Workflow marked as Active
- [ ] Test execution succeeds (green nodes)
- [ ] Database `ai_qualification` field populated with valid JSON
- [ ] Response `status` updated to qualified/disqualified
- [ ] Execution time <10 seconds
- [ ] Error handling works (Sentry fires on failure)
- [ ] External curl request works (outside n8n)
- [ ] Claude API usage visible in Anthropic Console
- [ ] Polish language handled correctly by Claude

---

## Next Steps (Future Implementation)

After workflow is working:

### 1. Integrate with Website API

**File:** `apps/website/app/api/survey/submit/route.ts`

Add after line 63 (after response insertion):

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
  }).catch(err => console.error('[N8N] Webhook failed:', err));
}
```

**Environment Variable:**
```bash
N8N_WEBHOOK_URL=https://n8n.trustcode.pl/webhook/survey-analysis
```

Add to:
- `.env.local` (local development)
- `.env.local.example` (documentation)
- Vercel dashboard → Environment Variables (production)

### 2. Display AI Results in CMS

**File:** `apps/cms/features/surveys/components/ResponseDetail.tsx`

Add section to display `ai_qualification`:

```tsx
{response.ai_qualification && (
  <div className="space-y-4">
    <h3>AI Analysis</h3>
    <div className="grid grid-cols-2 gap-4">
      <ScoreCard label="Overall" value={response.ai_qualification.overall_score} />
      <ScoreCard label="Urgency" value={response.ai_qualification.urgency_score} />
      <ScoreCard label="Complexity" value={response.ai_qualification.complexity_score} />
      <ScoreCard label="Value" value={response.ai_qualification.value_score} />
    </div>
    <p>{response.ai_qualification.summary}</p>
    <ul>
      {response.ai_qualification.notes_for_lawyer.map((note, i) => (
        <li key={i}>{note}</li>
      ))}
    </ul>
  </div>
)}
```

### 3. Email Notifications Based on Recommendation

**File:** `apps/cms/features/surveys/actions/send-qualification-email.ts`

Create Server Action to send email when `recommendation = 'QUALIFIED'`:

```typescript
if (ai_qualification.recommendation === 'QUALIFIED') {
  await sendEmail({
    to: tenant.email,
    subject: 'New Qualified Lead',
    body: `Client: ${response.answers.name}\nSummary: ${ai_qualification.summary}`
  });
}
```

### 4. Manual Re-trigger Button

Add button in CMS to re-run AI analysis:

```tsx
<Button onClick={async () => {
  await fetch('https://n8n.trustcode.pl/webhook/survey-analysis', {
    method: 'POST',
    body: JSON.stringify({ responseId: response.id, ... })
  });
}}>
  Re-analyze with AI
</Button>
```

---

## Maintenance

### Weekly Tasks
- Check n8n execution success rate (should be >95%)
- Review GlitchTip for recurring errors
- Monitor Claude API costs (Anthropic Console)

### Monthly Tasks
- Review AI prompt effectiveness (are scores accurate?)
- A/B test prompt variations if needed
- Check token usage trends (should stay ~1400 tokens/response)

### When to Update Workflow
- Claude model version changes (update `model` field)
- Database schema changes (update Supabase nodes)
- New AI scoring criteria (update prompt in Transform node)

---

## Support

If you encounter issues not covered in Troubleshooting:

1. Check n8n execution logs (click on failed execution)
2. Review GlitchTip error details
3. Test each node individually (Execute Node button)
4. Verify credentials are still valid
5. Check Supabase/Anthropic service status

**Common Resources:**
- n8n Docs: https://docs.n8n.io/
- Anthropic API Docs: https://docs.anthropic.com/
- Supabase Docs: https://supabase.com/docs

---

## Appendix: Workflow Architecture

```
┌─────────────────┐
│ Webhook Trigger │ ← POST /webhook/survey-analysis
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Supabase: Fetch Survey  │ ← Get questions array
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Function: Transform Q&A  │ ← Build AI prompt
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ HTTP: Claude Haiku API   │ ← Analyze response
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Function: Parse Output   │ ← Extract scores
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Supabase: Update Record  │ ← Save to ai_qualification
└────────┬─────────────────┘
         │
         ▼ (on error)
┌──────────────────────────┐
│ Sentry: Log Error        │ ← Report to GlitchTip
└──────────────────────────┘
```

**Execution Flow:**
1. Webhook receives payload (responseId, surveyId, answers)
2. Fetch survey questions from Supabase
3. Combine questions + answers into AI prompt
4. Send to Claude Haiku 4.5 for analysis
5. Parse JSON response (scores, recommendation, summary)
6. Update database with ai_qualification JSONB
7. If error occurs, log to GlitchTip

**Data Flow:**
- Input: Response UUID + Answers object
- Transform: Q&A pairs → AI prompt
- AI Output: Structured JSON with scores
- Database: JSONB field with complete analysis

**Error Handling:**
- Invalid survey ID → workflow fails, Sentry logs
- Missing answers → Claude handles gracefully
- Invalid JSON from Claude → saved to error field
- Database update fails → Sentry logs

---

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Maintainer:** Marcin Jucha
