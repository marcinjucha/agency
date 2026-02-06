---
name: n8n-workflows
description: N8n workflow patterns for AI Agency. Use when implementing background AI processing that shouldn't block user requests.
---

# N8n Workflows

**Purpose:** Background AI processing for survey responses (Claude Haiku + Supabase).

---

## When to Use

**Use n8n (not Next.js API route) for survey AI analysis:**
- AI takes 5-8s (Vercel timeout risk)
- User needs instant confirmation (fire-and-forget)
- Retry logic needed (network failures)

**Decision:** Survey submission → Next.js saves to DB → triggers n8n webhook → AI analysis in background.

---

## ai_qualification JSONB Structure

**Database field:** `responses.ai_qualification` (JSONB)

```typescript
{
  // Scores (0-10)
  urgency_score: number,
  complexity_score: number,
  value_score: number,
  success_probability: number,

  // Weighted: 30% urgency + 30% value + 25% success + 15% complexity
  overall_score: number,

  // Analysis
  summary: string,
  recommendation: 'QUALIFIED' | 'DISQUALIFIED' | 'NEEDS_MORE_INFO',
  notes_for_lawyer: string[],

  // Metadata
  analyzed_at: string,
  model: 'claude-haiku-4-5',
  version: '1.0'
}
```

**Why weighted 30/30/25/15:**
- Urgency (30%): Triage priority (deadlines, statute of limitations)
- Value (30%): Economic priority (revenue potential)
- Success (25%): Resource allocation (winnable cases first)
- Complexity (15%): Least important (complex ≠ valuable)

**Why JSONB (not separate tables):**
- Schema evolution without migrations (add confidence_score later)
- Atomic updates (single UPDATE, no transactions)
- GIN indexable for fast queries

---

## Integration

### Website API Trigger

**File:** `apps/website/app/api/survey/submit/route.ts`

**Add after response insertion (line ~63):**

```typescript
// Trigger n8n AI analysis (fire-and-forget)
if (process.env.N8N_WEBHOOK_URL) {
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      responseId: responseData.id,
      surveyId: surveyId,
      tenant_id: surveyData.tenant_id,
      answers: answers
    })
  }).catch(err => console.error('[N8N]:', err));
}
```

**Environment:**
```bash
N8N_WEBHOOK_URL=https://n8n.trustcode.pl/webhook/survey-analysis
```

---

## N8n Workflow Configuration

### Credential: service_role (not anon)

**Why:** Background workflow needs RLS bypass (no user context).

**N8n credential:** AI Agency Supabase → service_role key

### Model: Claude Haiku (not Sonnet)

**Why:** Simple 0-10 scoring task.

**Cost:** $0.0008 per response (Haiku) vs $0.015 (Sonnet) = 19x cheaper

**Quality:** ±0.5 score variance (acceptable for triage).

**Use Sonnet when:** Complex reasoning, narrative generation, high-stakes decisions.

### Node Configuration

**Claude Haiku node:**
```json
{
  "model": "claude-haiku-4-5-20250710",
  "max_tokens": 1000,
  "temperature": 0.3,
  "system": "Odpowiadasz TYLKO w formacie JSON bez dodatkowych komentarzy."
}
```

**Temperature 0.3:** Lower = consistent scores (less variance).

---

## Error Handling

### Graceful Degradation

**Parse function (n8n):**

```javascript
try {
  const aiAnalysis = JSON.parse(aiResponse.content[0].text);
  // ... structure qualification
} catch (error) {
  return {
    qualification: {
      error: 'Failed to parse AI response',
      raw_response: aiResponse.content?.[0]?.text,
      analyzed_at: new Date().toISOString()
    },
    newStatus: 'new'
  };
}
```

**Why preserve raw_response:** Manual debugging + retry possible.

### Retry Logic

**Claude API node:** 3 retries, 5s delay (handles transient failures).

### Sentry Error Path

**Optional:** Connect Supabase Update error → Sentry node (GlitchTip logging).

---

## Testing Verification

**Get real UUIDs:**

```sql
SELECT id as survey_id, tenant_id FROM surveys LIMIT 1;
SELECT id as response_id FROM responses
WHERE survey_id = '[SURVEY_ID]' AND ai_qualification IS NULL LIMIT 1;
```

**Test workflow:**

```bash
curl -X POST https://n8n.trustcode.pl/webhook/survey-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "responseId": "[RESPONSE_UUID]",
    "surveyId": "[SURVEY_UUID]",
    "tenant_id": "[TENANT_UUID]",
    "answers": {"[QUESTION_UUID]": "Test answer"}
  }'
```

**Verify database:**

```sql
SELECT status, ai_qualification->>'recommendation', ai_qualification->>'overall_score'
FROM responses WHERE id = '[RESPONSE_UUID]';
```

**Expected:** status changed, recommendation present, score populated.

---

## Quick Reference

**Webhook:** `https://n8n.trustcode.pl/webhook/survey-analysis`

**Credentials (n8n):**
- Anthropic API (HTTP Header Auth: x-api-key)
- AI Agency Supabase (service_role key)
- GlitchTip (Sentry DSN - optional)

**Cost:** ~$0.0008 per response (Haiku)

**Performance:** 5-8s execution, >95% success rate

**Documentation:** `n8n-workflows/` directory (SETUP_GUIDE.md, TROUBLESHOOTING.md)
