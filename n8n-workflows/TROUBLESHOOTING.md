# N8n Survey Analysis - Troubleshooting Guide

Quick reference for debugging workflow issues.

---

## Quick Diagnostics

### 1. Is the workflow active?

**Check:**
- Login to n8n at `https://n8n.trustcode.pl/`
- Open "Survey Response AI Analysis" workflow
- Look for toggle switch in top right
- Should be **ON** (green)

**Fix:** Toggle to ON, click Save

---

### 2. Can the webhook be reached?

**Test:**
```bash
curl -v https://n8n.trustcode.pl/webhook/survey-analysis
```

**Expected Response:**
- HTTP 405 Method Not Allowed
- Body: `"Method not allowed. Please check you are using the right HTTP method"`

**If Connection Refused:**
- n8n server is down
- Check n8n Docker container status
- Verify firewall/network settings

**If 404 Not Found:**
- Workflow is not active
- Webhook path is incorrect
- Check workflow settings

---

### 3. Are credentials valid?

**Test Each Credential:**

#### Supabase
```bash
curl -X GET 'https://[PROJECT].supabase.co/rest/v1/surveys?select=id&limit=1' \
  -H "apikey: [SERVICE_ROLE_KEY]" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
```

Expected: JSON array with survey IDs

#### Anthropic API
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: [YOUR_KEY]" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20250710","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

Expected: JSON response with Claude's reply

#### GlitchTip
```bash
curl -X POST https://glitchtip.trustcode.pl/api/1/envelope/ \
  -H "Content-Type: application/json" \
  -d '{"dsn":"https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1"}'
```

Expected: 200 OK or error message (confirms connection)

---

## Common Error Patterns

### Error: "Workflow execution timed out"

**Symptom:** Execution stops after 60 seconds

**Causes:**
- Claude API is slow (rare)
- Database query hanging
- Network issues

**Debug:**
1. Check which node timed out (click execution → see red node)
2. Check n8n execution history for timing details
3. Test API directly (see Quick Diagnostics #3)

**Fix:**
- Increase timeout in HTTP Request node (currently 30s)
- Check Supabase query performance
- Verify network connectivity

---

### Error: "Survey not found"

**Symptom:** Supabase Fetch node returns empty array

**Causes:**
- Invalid survey UUID
- Survey was deleted (soft delete)
- Wrong tenant_id

**Debug:**
```sql
-- Check if survey exists
SELECT id, title, deleted_at
FROM surveys
WHERE id = '[SURVEY_UUID]';

-- If deleted_at is not null, survey is soft-deleted
```

**Fix:**
- Use valid survey UUID (see test-data-queries.sql)
- Check webhook payload has correct surveyId
- Ensure survey is not deleted

---

### Error: "Response not found" (Update fails)

**Symptom:** Supabase Update node fails

**Causes:**
- Invalid response UUID
- Response was deleted
- RLS policy blocking (shouldn't happen with service_role)

**Debug:**
```sql
-- Check if response exists
SELECT id, survey_id, deleted_at
FROM responses
WHERE id = '[RESPONSE_UUID]';

-- Try manual update
UPDATE responses
SET ai_qualification = '{"test": true}'::jsonb
WHERE id = '[RESPONSE_UUID]';
```

**Fix:**
- Use valid response UUID
- Check webhook payload has correct responseId
- Verify service_role key is being used (not anon key)

---

### Error: "Invalid JSON from Claude"

**Symptom:** Parse node fails, ai_qualification contains error field

**Causes:**
- Prompt not clear enough
- Polish language causing issues
- Token limit reached (response cut off)

**Debug:**
```sql
-- View raw Claude response
SELECT
  id,
  ai_qualification->'raw_response' as raw_response
FROM responses
WHERE ai_qualification ? 'error'
ORDER BY created_at DESC
LIMIT 1;
```

**Common Issues:**
1. **Response cut off:** Increase max_tokens (currently 1000)
2. **Non-JSON format:** Claude ignored instructions
3. **Markdown formatting:** Claude wrapped JSON in ```json blocks

**Fix:**

Option 1: Update prompt to be more explicit
```javascript
// In Transform node, add to prompt:
"WAŻNE: Odpowiedź TYLKO samym JSON-em, bez formatowania markdown, bez komentarzy."
```

Option 2: Add JSON cleaning in Parse node
```javascript
// In Parse node, before JSON.parse():
let cleanText = aiText.trim();
// Remove markdown code blocks if present
if (cleanText.startsWith('```')) {
  cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
}
const aiAnalysis = JSON.parse(cleanText);
```

Option 3: Increase max_tokens
```json
// In Claude Haiku Analysis node
"max_tokens": 2000  // was 1000
```

---

### Error: "Authentication failed" (Supabase)

**Symptom:** 401 Unauthorized from Supabase

**Causes:**
- Using anon key instead of service_role key
- API key expired or revoked
- Incorrect host format

**Debug:**
1. Check credential in n8n: Settings → Credentials → Halo-Efekt Supabase
2. Verify key format: should be long JWT starting with `eyJhbG...`
3. Check host format: `xxx.supabase.co` (no `https://`)

**Fix:**
1. Get service_role key from Supabase Dashboard → Project Settings → API
2. Update credential in n8n
3. Test connection (Credential → Test button)

---

### Error: "401 Unauthorized" (Anthropic)

**Symptom:** Claude API returns 401

**Causes:**
- Invalid API key
- Wrong header name
- API key revoked

**Debug:**
1. Check credential in n8n: Settings → Credentials → Anthropic API
2. Verify header name is `x-api-key` (not `Authorization`)
3. Test key in Anthropic Console (try to create a chat)

**Fix:**
1. Get new API key from https://console.anthropic.com/ → Settings → API Keys
2. Update credential in n8n
3. Verify `anthropic-version: 2023-06-01` header is present

---

### Error: "Cannot read property 'question' of undefined"

**Symptom:** Transform node fails

**Causes:**
- Survey has no questions (empty array)
- questions field is null
- JSONB structure is wrong

**Debug:**
```sql
-- Check survey structure
SELECT
  id,
  questions IS NULL as is_null,
  jsonb_array_length(questions) as question_count,
  jsonb_pretty(questions) as questions_formatted
FROM surveys
WHERE id = '[SURVEY_UUID]';
```

**Fix:**
1. Ensure survey has at least 1 question
2. Add null check in Transform node:
```javascript
if (!questions || questions.length === 0) {
  throw new Error('Survey has no questions');
}
```

---

### Error: "Sentry node not firing"

**Symptom:** Workflow fails but no error in GlitchTip

**Causes:**
- Sentry node not connected to error path
- DSN incorrect
- GlitchTip server unreachable

**Debug:**
1. Check n8n workflow editor: red line from previous node to Sentry?
2. Check credential: Settings → Credentials → GlitchTip Halo-Efekt
3. Force an error (invalid survey UUID) and check if Sentry fires

**Fix:**
1. Connect Sentry node to error path:
   - Click on last node (Supabase Update)
   - Click "On Error" output (red dot)
   - Connect to Sentry node
2. Verify DSN: `https://bed6a207b979467bbb60e51d25995111@glitchtip.trustcode.pl/1`
3. Test manual event in GlitchTip UI

---

## Performance Issues

### Issue: Workflow takes >10 seconds

**Symptom:** Execution time exceeds target (5-8s)

**Debug:**
1. Check execution timeline in n8n (click execution → view timing)
2. Identify slow node (usually Claude API or Supabase)

**Typical Timings:**
- Webhook: <100ms
- Supabase Fetch: 200-500ms
- Transform: <50ms
- Claude API: 2-5s (can vary)
- Parse: <50ms
- Supabase Update: 200-500ms

**Optimization Options:**

1. **If Claude is slow (>5s):**
   - Reduce prompt length (fewer Q&A pairs)
   - Lower max_tokens (currently 1000, try 800)
   - Check Anthropic API status page

2. **If Supabase Fetch is slow (>1s):**
   - Add database index on surveys.id
   - Check Supabase project performance (dashboard)
   - Reduce selected fields (currently: id,title,questions)

3. **If Supabase Update is slow (>1s):**
   - JSONB field size might be large (check with pg_column_size)
   - Add GIN index on ai_qualification
   - Check RLS policies (shouldn't apply to service_role)

---

### Issue: High Claude API costs

**Symptom:** Monthly bill higher than expected

**Expected Cost:**
- ~$0.0008 per response
- 1000 responses = ~$0.80/month
- 10,000 responses = ~$8/month

**Debug:**
1. Check Anthropic Console → Usage
2. Look for token usage per request (should be ~1400 tokens)
3. Check for unexpected API calls

**Common Causes:**
1. Duplicate API calls (workflow re-executed)
2. Large Q&A context (many questions)
3. Verbose prompts

**Fix:**
1. Add idempotency check (don't re-analyze if ai_qualification exists)
2. Reduce prompt verbosity
3. Consider using Claude Haiku instead of Sonnet (already using Haiku)

---

## Database Issues

### Issue: ai_qualification not populated

**Symptom:** Database record not updated after workflow succeeds

**Debug:**
```sql
-- Check if update was attempted
SELECT
  id,
  ai_qualification IS NULL as is_null,
  updated_at,
  status
FROM responses
WHERE id = '[RESPONSE_UUID]';

-- Check n8n execution history
-- Look for Supabase Update node output
```

**Causes:**
1. Update query had wrong filter (no matching id)
2. RLS policy blocking (rare with service_role)
3. JSONB serialization failed

**Fix:**
1. Verify responseId in webhook payload matches database
2. Check Supabase Update node filter: `id = {{ $json.responseId }}`
3. Test manual update:
```sql
UPDATE responses
SET ai_qualification = '{"test": true}'::jsonb
WHERE id = '[RESPONSE_UUID]';
```

---

### Issue: Status not changing to qualified/disqualified

**Symptom:** ai_qualification is populated but status remains 'new'

**Debug:**
```sql
SELECT
  id,
  status,
  ai_qualification->>'recommendation' as recommendation
FROM responses
WHERE id = '[RESPONSE_UUID]';
```

**Causes:**
- Parse node not setting newStatus correctly
- Recommendation is 'NEEDS_MORE_INFO' (status should stay 'new')

**Check Parse Node Logic:**
```javascript
// This maps recommendation to status
if (aiAnalysis.recommendation === 'QUALIFIED') {
  newStatus = 'qualified';
} else if (aiAnalysis.recommendation === 'DISQUALIFIED') {
  newStatus = 'disqualified';
}
// NEEDS_MORE_INFO leaves status as 'new'
```

**Fix:** Verify recommendation value and mapping logic

---

## Network Issues

### Issue: "Connection timeout"

**Symptom:** Nodes fail with ECONNREFUSED or ETIMEDOUT

**Causes:**
1. Network connectivity issues
2. Firewall blocking requests
3. Target server down (Supabase/Anthropic/GlitchTip)

**Debug:**
1. Check n8n server network connectivity
2. Test external APIs from n8n server:
```bash
# From n8n server terminal
curl https://api.anthropic.com/v1/messages
curl https://[project].supabase.co/rest/v1/
```

**Fix:**
1. Check firewall rules (allow outbound HTTPS)
2. Verify DNS resolution
3. Check service status pages:
   - Supabase: https://status.supabase.com/
   - Anthropic: https://status.anthropic.com/

---

## Data Validation Issues

### Issue: Answers object empty or malformed

**Symptom:** Claude receives no Q&A context

**Debug:**
1. Check webhook payload: does `answers` object exist?
2. View Transform node output: is `prompt` field populated?

**Example Invalid Payload:**
```json
{
  "answers": {}  // Empty - no questions answered
}
```

**Example Valid Payload:**
```json
{
  "answers": {
    "q-uuid-1": "Jan Kowalski",
    "q-uuid-2": "jan@example.com"
  }
}
```

**Fix:**
1. Validate payload before sending to n8n
2. Add check in Transform node:
```javascript
if (Object.keys(answers).length === 0) {
  throw new Error('No answers provided');
}
```

---

## How to Debug (Step-by-Step)

### When workflow fails:

1. **Check n8n execution history**
   - Executions tab
   - Click failed execution (red X)
   - Identify which node failed

2. **Inspect node output**
   - Click on failed node
   - View "Output" tab
   - Read error message

3. **Check error details**
   - Look for HTTP status code (401, 404, 500)
   - Read error message carefully
   - Note which service caused error (Supabase/Anthropic)

4. **Test credentials**
   - Settings → Credentials
   - Click on relevant credential
   - Click "Test" button

5. **Test manually**
   - Use curl commands from TEST_COMMANDS.md
   - Isolate which component is failing

6. **Check logs**
   - GlitchTip for application errors
   - n8n execution logs for workflow details
   - Supabase logs (if database issue)

7. **Fix and re-test**
   - Apply fix from this guide
   - Re-run workflow
   - Verify success

---

## Emergency Procedures

### If workflow is causing issues:

1. **Disable workflow immediately**
   - Open workflow in n8n
   - Toggle "Active" to OFF
   - Click Save

2. **Investigate issue**
   - Review recent executions
   - Check error patterns
   - Read this troubleshooting guide

3. **Test fix in isolation**
   - Keep workflow disabled
   - Test changes manually (curl)
   - Verify fix works

4. **Re-enable carefully**
   - Toggle "Active" to ON
   - Monitor first few executions
   - Watch for errors

---

## Prevention Checklist

To avoid issues:

- [ ] All credentials tested before going live
- [ ] Workflow tested with real data (not just sample)
- [ ] Error handling configured (Sentry node connected)
- [ ] Timeouts set appropriately (30s for API calls)
- [ ] Retry logic enabled (3 retries, 5s delay)
- [ ] Monitoring set up (GlitchTip + n8n execution history)
- [ ] Documentation reviewed (SETUP_GUIDE.md)
- [ ] Test commands validated (TEST_COMMANDS.md)

---

## Getting Help

### Before asking for help:

1. Read this troubleshooting guide
2. Check n8n execution history
3. Review GlitchTip errors
4. Test credentials manually
5. Try test commands from TEST_COMMANDS.md

### When reporting issues:

Provide:
- Exact error message
- n8n execution ID
- Node that failed
- Webhook payload used
- Expected vs actual behavior
- Screenshots if helpful

### Resources:

- **N8n Community:** https://community.n8n.io/
- **N8n Docs:** https://docs.n8n.io/
- **Anthropic Support:** https://support.anthropic.com/
- **Supabase Support:** https://supabase.com/support

---

## Appendix: Error Code Reference

### HTTP Status Codes

| Code | Meaning | Common Cause | Fix |
|------|---------|--------------|-----|
| 400 | Bad Request | Invalid JSON payload | Check request format |
| 401 | Unauthorized | Invalid API key | Update credential |
| 403 | Forbidden | RLS policy blocking | Use service_role key |
| 404 | Not Found | Resource doesn't exist | Check UUID is valid |
| 405 | Method Not Allowed | Using GET instead of POST | Use POST method |
| 408 | Timeout | Request took too long | Increase timeout |
| 429 | Too Many Requests | Rate limit exceeded | Add delay between requests |
| 500 | Internal Server Error | Server-side issue | Check service status |
| 502 | Bad Gateway | Proxy/network issue | Check network connectivity |
| 503 | Service Unavailable | Server down/maintenance | Wait and retry |

### N8n Error Types

| Error | Cause | Solution |
|-------|-------|----------|
| NODE_EXECUTION_ERROR | Node failed to execute | Check node configuration |
| WORKFLOW_EXECUTION_TIMEOUT | Workflow exceeded timeout | Increase execution timeout |
| CREDENTIAL_ERROR | Credential invalid/missing | Update credential |
| EXPRESSION_ERROR | Expression syntax error | Fix {{ }} expression |
| JSON_PARSE_ERROR | Invalid JSON | Fix JSON syntax |

---

**Last Updated:** 2026-02-04
**Maintainer:** Marcin Jucha
