---
name: n8n-patterns
description: Use when implementing N8n background AI processing for survey qualification — fire-and-forget pattern, ai_qualification JSONB structure, webhook integration, credential selection. Use N8n when AI ops >2s or retry logic needed.
---

# N8n Patterns

## When to Use N8n (not Next.js API route)

- AI takes 5-8s → Vercel timeout risk
- User needs instant confirmation → fire-and-forget
- Retry logic needed → network failure resilience

**Decision flow:** Survey submission → Next.js saves to DB → triggers n8n webhook → AI analysis in background.

---

## ai_qualification JSONB Structure

**Database field:** `responses.ai_qualification` (JSONB)

```typescript
{
  urgency_score: number,       // 0-10
  complexity_score: number,    // 0-10
  value_score: number,         // 0-10
  success_probability: number, // 0-10

  // Weighted: urgency(30%) + value(30%) + success(25%) + complexity(15%)
  overall_score: number,

  summary: string,
  recommendation: 'QUALIFIED' | 'DISQUALIFIED' | 'NEEDS_MORE_INFO',
  notes_for_lawyer: string[],

  analyzed_at: string,
  model: 'claude-haiku-4-5',
  version: '1.0'
}
```

**Why 30/30/25/15 weights:** Urgency + Value highest (triage + economics), Success next (winnability), Complexity lowest (doesn't drive decision alone).

**Why JSONB:** Schema evolution without migrations, atomic updates.

---

## Credentials

**Supabase:** Use service_role key (not anon). Background workflow has no user context → needs RLS bypass.

**Model:** Claude Haiku (not Sonnet). Simple 0-10 scoring — Haiku sufficient and cheaper. Use Sonnet only for complex reasoning or narrative generation.

**Claude Haiku node config:**
```json
{
  "model": "claude-haiku-4-5-20250710",
  "max_tokens": 1000,
  "temperature": 0.3,
  "system": "Odpowiadasz TYLKO w formacie JSON bez dodatkowych komentarzy."
}
```

**Temperature 0.3:** Lower = consistent scores across submissions, less variance.

---

## Website Integration (Fire-and-Forget)

**File:** `apps/website/app/api/survey/submit/route.ts` — add after response insertion (~line 63):

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

No `await` — user gets instant response, n8n processes independently.

---

## Error Handling

**Graceful degradation — preserve raw_response for debugging:**

```javascript
try {
  const aiAnalysis = JSON.parse(aiResponse.content[0].text);
  // structure qualification object
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

**Retry logic:** Claude API node — 3 retries, 5s delay (handles transient failures).

**Optional:** Connect Supabase Update error output → Sentry/GlitchTip node for logging.

---

## Testing

**Step 1 — get real UUIDs from DB (required, don't use fake values):**

```sql
SELECT id as survey_id, tenant_id FROM surveys LIMIT 1;
SELECT id as response_id FROM responses
WHERE survey_id = '[SURVEY_ID]' AND ai_qualification IS NULL LIMIT 1;
```

**Step 2 — curl test:**

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

**Step 3 — verify ai_qualification populated:**

```sql
SELECT status, ai_qualification->>'recommendation', ai_qualification->>'overall_score'
FROM responses WHERE id = '[RESPONSE_UUID]';
```

Expected: status changed, recommendation present, score populated.

---

## Quick Reference

**Webhook:** `https://n8n.trustcode.pl/webhook/survey-analysis`

**N8n credentials:**
- Anthropic API (HTTP Header Auth: x-api-key)
- AI Agency Supabase (service_role key)
- GlitchTip (Sentry DSN — optional)
