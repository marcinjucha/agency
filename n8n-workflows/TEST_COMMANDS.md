# N8n Survey Analysis - Test Commands

Quick reference for testing the workflow.

---

## Prerequisites

Get real UUIDs from database:

```sql
-- Step 1: Get survey and tenant IDs
SELECT id as survey_id, tenant_id, title
FROM surveys
LIMIT 1;

-- Step 2: Get response ID for that survey
SELECT id as response_id, survey_id, answers
FROM responses
WHERE survey_id = '[SURVEY_ID_FROM_STEP_1]'
LIMIT 1;

-- Step 3: Get question IDs for that survey
SELECT id as question_id, question, type, "order"
FROM jsonb_to_recordset(
  (SELECT questions FROM surveys WHERE id = '[SURVEY_ID_FROM_STEP_1]')
) AS x(id text, question text, type text, "order" int)
ORDER BY "order";
```

---

## Test 1: Basic Success Case

Replace `[PLACEHOLDERS]` with real UUIDs from Prerequisites:

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_1]": "Jan Kowalski",
      "[QUESTION_UUID_2]": "jan@example.com",
      "[QUESTION_UUID_3]": "Sprawa rozwodowa - mąż nie zgadza się na podział majątku. Chcę uzyskać alimenty na dwójkę dzieci."
    }
  }'
```

**Expected Response:**
- HTTP 200
- Body: Success message or empty (depends on n8n config)

**Verify in Database:**

```sql
SELECT
  id,
  status,
  ai_qualification->>'recommendation' as recommendation,
  ai_qualification->>'overall_score' as score,
  ai_qualification->>'summary' as summary,
  jsonb_pretty(ai_qualification) as full_analysis
FROM responses
WHERE id = '[RESPONSE_UUID]';
```

**Expected Output:**
```
status: qualified (or disqualified)
recommendation: QUALIFIED
score: 7.2
summary: Sprawa rozwodowa z konfliktem o podział majątku i alimenty
```

---

## Test 2: Multiple Choice Answers

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_1]": "Anna Nowak",
      "[QUESTION_UUID_2]": "anna@example.com",
      "[QUESTION_UUID_MULTIPLE]": ["Prawo rodzinne", "Prawo pracy", "Windykacja"]
    }
  }'
```

**Expected:** Array values joined with commas in AI prompt

---

## Test 3: Missing Answers

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_1]": "Jan Kowalski"
    }
  }'
```

**Expected:** Claude handles missing answers, displays "(brak odpowiedzi)"

---

## Test 4: Invalid Survey ID (Error Test)

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
- Workflow fails at Supabase Fetch node
- Sentry node fires
- Error logged to GlitchTip

**Check GlitchTip:**

```bash
# Login to https://glitchtip.trustcode.pl/
# Navigate to Project #1
# Should see error event with details
```

---

## Test 5: Invalid Response ID (Error Test)

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "00000000-0000-0000-0000-000000000000",
    "surveyId": "[VALID_SURVEY_UUID]",
    "tenant_id": "[VALID_TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_1]": "Test"
    }
  }'
```

**Expected:**
- Workflow succeeds until Supabase Update
- Update fails (no matching response)
- Sentry logs error

---

## Test 6: Complex Case (High Scores Expected)

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_NAME]": "Maria Kowalska",
      "[QUESTION_UUID_EMAIL]": "maria@example.com",
      "[QUESTION_UUID_CASE]": "Sprawa o odszkodowanie za wypadek przy pracy. Pracodawca odmawia wypłaty. Posiadam dokumentację medyczną potwierdzającą trwały uszczerbek na zdrowiu 20%. Sprawa pilna - upływa termin przedawnienia za 3 miesiące. Wartość roszczenia około 200 000 zł."
    }
  }'
```

**Expected Scores:**
- Urgency: 8-9 (deadline pressure)
- Complexity: 7-8 (legal + medical docs)
- Value: 9-10 (high economic value)
- Success: 8-9 (solid documentation)
- Recommendation: QUALIFIED

---

## Test 7: Low Value Case (Disqualified Expected)

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_NAME]": "Jan Testowy",
      "[QUESTION_UUID_EMAIL]": "jan@test.pl",
      "[QUESTION_UUID_CASE]": "Mam spór z sąsiadem o 50 cm płotu. Chcę pozwać go do sądu."
    }
  }'
```

**Expected Scores:**
- Urgency: 2-3 (not urgent)
- Complexity: 3-4 (simple neighbor dispute)
- Value: 1-2 (very low economic value)
- Success: 5-6 (valid case but trivial)
- Recommendation: DISQUALIFIED (or NEEDS_MORE_INFO)

---

## Test 8: Incomplete Information

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {
      "[QUESTION_UUID_NAME]": "Test",
      "[QUESTION_UUID_EMAIL]": "test@test.pl",
      "[QUESTION_UUID_CASE]": "Potrzebuję pomocy prawnej"
    }
  }'
```

**Expected:**
- Recommendation: NEEDS_MORE_INFO
- Status remains: new (not changed to qualified/disqualified)

---

## Verification Queries

### Check Recent AI Analyses

```sql
SELECT
  r.id,
  r.created_at,
  r.status,
  s.title as survey_title,
  r.ai_qualification->>'recommendation' as recommendation,
  (r.ai_qualification->>'overall_score')::numeric as overall_score,
  r.ai_qualification->>'summary' as summary
FROM responses r
JOIN surveys s ON s.id = r.survey_id
WHERE r.ai_qualification IS NOT NULL
ORDER BY r.created_at DESC
LIMIT 10;
```

### Check Analysis Statistics

```sql
SELECT
  COUNT(*) as total_analyzed,
  COUNT(*) FILTER (WHERE ai_qualification->>'recommendation' = 'QUALIFIED') as qualified,
  COUNT(*) FILTER (WHERE ai_qualification->>'recommendation' = 'DISQUALIFIED') as disqualified,
  COUNT(*) FILTER (WHERE ai_qualification->>'recommendation' = 'NEEDS_MORE_INFO') as needs_info,
  ROUND(AVG((ai_qualification->>'overall_score')::numeric), 2) as avg_score
FROM responses
WHERE ai_qualification IS NOT NULL;
```

### Check Error Cases

```sql
SELECT
  id,
  created_at,
  ai_qualification->'error' as error_message,
  ai_qualification->'raw_response' as raw_response
FROM responses
WHERE ai_qualification ? 'error'
ORDER BY created_at DESC;
```

---

## N8n UI Testing

### Manual Test in n8n

1. Login to n8n: `https://n8n.trustcode.pl/`
2. Open workflow: "Survey Response AI Analysis"
3. Click "Execute Workflow"
4. Click "Webhook" node → "Listen for Test Event"
5. Run curl command from terminal
6. Watch nodes light up green
7. Click each node to see output

### Check Execution History

1. Go to n8n → "Executions" tab
2. View recent runs
3. Green ✓ = success
4. Red ✗ = failure (click to debug)
5. Filter by "Failed" to see errors only

---

## Performance Testing

### Measure Execution Time

```bash
# Add timing to curl
time curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Target:** <10 seconds total

### Batch Test (10 requests)

```bash
#!/bin/bash

for i in {1..10}; do
  echo "Request $i..."
  curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
    -H "Content-Type: application/json" \
    -d '{
      "responseId": "[DIFFERENT_RESPONSE_UUID]",
      "surveyId": "[SURVEY_UUID]",
      "tenant_id": "[TENANT_UUID]",
      "answers": { ... }
    }'
  echo ""
  sleep 2
done
```

**Check:**
- All 10 should succeed
- Total time: ~80 seconds (8s per request + 2s sleep)
- Check n8n execution history for success rate

---

## Claude API Monitoring

### Check API Usage

1. Login to https://console.anthropic.com/
2. Go to Dashboard → Usage
3. Verify:
   - API calls count increasing
   - Token usage per request (~1400 tokens)
   - Cost per request (~$0.0008)

### Token Breakdown (Approximate)

- **Input tokens:** ~1200 (prompt + Q&A context)
- **Output tokens:** ~200 (JSON response)
- **Total:** ~1400 tokens
- **Cost:** $0.0008 at Claude Haiku pricing

---

## GlitchTip Error Monitoring

### Check Error Logs

1. Login to `https://glitchtip.trustcode.pl/`
2. Navigate to Project #1
3. Should see errors only from failed tests
4. Click event to see full stack trace

### Expected Error Events

- Invalid survey ID → "Survey not found"
- Invalid response ID → "Response not found"
- Network issues → "Connection timeout"

### Healthy State

- Zero errors in last 24h (if all tests pass)
- Error rate: <5% (excluding intentional error tests)

---

## Troubleshooting Quick Checks

### If webhook doesn't respond:

```bash
curl -v https://n8n.trustcode.pl/webhook/survey-analysis
# Should return 405 Method Not Allowed (GET not allowed, only POST)
```

### If Supabase fails:

```bash
# Test direct Supabase query
curl -X GET 'https://[PROJECT].supabase.co/rest/v1/surveys?id=eq.[UUID]&select=*' \
  -H "apikey: [SERVICE_ROLE_KEY]" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
```

### If Claude fails:

```bash
# Test direct Anthropic API
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: [YOUR_KEY]" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-haiku-4-5-20250710",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Success Criteria

All tests should pass:

- [ ] Test 1: Basic success case ✅
- [ ] Test 2: Multiple choice answers ✅
- [ ] Test 3: Missing answers handled gracefully ✅
- [ ] Test 4: Invalid survey ID → error logged ✅
- [ ] Test 5: Invalid response ID → error logged ✅
- [ ] Test 6: Complex case → high scores ✅
- [ ] Test 7: Low value case → disqualified ✅
- [ ] Test 8: Incomplete info → needs more info ✅

Performance:
- [ ] Execution time <10s ✅
- [ ] Success rate >95% ✅
- [ ] Claude API cost <$0.001 per request ✅

Monitoring:
- [ ] n8n execution history shows green ✅
- [ ] GlitchTip logs errors correctly ✅
- [ ] Database records updated ✅

---

**Quick Start Command:**

```bash
# Replace placeholders and run
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "PASTE_RESPONSE_UUID",
    "surveyId": "PASTE_SURVEY_UUID",
    "tenant_id": "PASTE_TENANT_UUID",
    "answers": {
      "PASTE_QUESTION_UUID": "Test answer"
    }
  }'
```

Then check database:

```sql
SELECT * FROM responses WHERE id = 'PASTE_RESPONSE_UUID';
```
