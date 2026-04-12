# Workflow Engine — E2E Manual Test Guide

> Updated: 2026-04-12 | Architecture: [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md)

Manual test documentation for the full workflow execution path via n8n Orchestrator.

---

## Prerequisites

### Environment Variables (CMS — `apps/cms/.env.local`)

```bash
ORCHESTRATOR_WEBHOOK_SECRET=<shared-secret>     # Bearer token for CMS → n8n auth
N8N_WORKFLOW_ORCHESTRATOR_URL=https://n8n.trustcode.pl/webhook/workflow-orchestrator
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
HOST_URL=http://localhost:3001
```

### Environment Variables (Website — `apps/website/.env.local`)

```bash
HOST_URL=http://localhost:3001              # Points to CMS for trigger dispatch
```

### Services Running

- CMS: `npm run dev:cms` (http://localhost:3001)
- Website: `npm run dev:website` (http://localhost:3000)
- n8n: running at `https://n8n.trustcode.pl` with Orchestrator + all handler subworkflows imported
- Supabase: local (`supabase start`) or linked remote

---

## Test Path 1: Full pipeline (survey → condition → AI → email)

### Using TestModePanel (recommended)

1. Open CMS → Workflows → open workflow editor
2. Click **Test** to open TestModePanel
3. Enter trigger payload (or select from execution history):
```json
{
  "trigger_type": "survey_submitted",
  "responseId": "<real-response-UUID-from-DB>",
  "surveyLinkId": "<real-survey-link-UUID>"
}
```
4. Click **Uruchom test**
5. Watch canvas nodes get status overlays: green (completed), red (failed), gray (skipped)
6. Check execution detail for each step's output

### Using curl

```bash
curl -X POST https://n8n.trustcode.pl/webhook/workflow-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ORCHESTRATOR_WEBHOOK_SECRET" \
  -d '{
    "workflowId": "<workflow-UUID>",
    "tenantId": "19342448-4e4e-49ba-8bf0-694d5376f953",
    "triggerPayload": {
      "trigger_type": "survey_submitted",
      "responseId": "<real-response-UUID>",
      "surveyLinkId": "<real-survey-link-UUID>"
    }
  }'
```

**Important:** Use real UUIDs from the database. Fake IDs will cause Trigger Handler to fail (response not found).

---

## What to Verify Per Step

### Trigger step (survey_submitted)

**Check in n8n execution → Fetch Survey Data node output:**
- `surveyTitle` populated
- `qaContext` contains real Q&A text (not just IDs)
- `clientEmail` resolved
- `answers` array has questionText + answer pairs

### Condition step

**Check in n8n execution → Evaluate Condition node output:**
- `branch`: `"true"` or `"false"`
- `skippedStepIds`: array of step IDs on non-taken branch
- Expression was pre-resolved (e.g., `"7 >= 5"`, not `"overallScore >= 5"`)

### AI Action step

**Check in n8n execution → Parse AI Result node output:**
- `stepResult.success: true`
- `outputPayload` contains expected keys from output_schema (overallScore, recommendation)
- NOT raw markdown or thinking content

### Send Email step

**Check:**
1. n8n execution → Build Success Result: `emailSent: true`, `recipientEmail` populated
2. Resend dashboard: email actually sent

---

## Troubleshooting

### Workflow not triggered

| Check | How |
|-------|-----|
| Workflow active? | `SELECT is_active FROM workflows WHERE id = 'X'` |
| Trigger type matches? | `SELECT trigger_type FROM workflows WHERE id = 'X'` |
| Auth token correct? | Compare `ORCHESTRATOR_WEBHOOK_SECRET` in CMS .env.local and n8n environment |
| n8n reachable? | `curl -I https://n8n.trustcode.pl/webhook/workflow-orchestrator` |

### Trigger Handler fails

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Response X not found" | Fake/test responseId | Use real UUID from `responses` table |
| 404 on Supabase query | Wrong table name | Check `responses`, `survey_links`, `surveys` (not `survey_answers` or `questions`) |
| "variableContext.responseId" undefined | Payload missing responseId | Ensure triggerPayload includes `responseId` |

### Step stuck in "running"

n8n Orchestrator uses dead-end pattern for DB writes. If a handler subworkflow crashes without returning, the step stays "running". Check n8n execution logs for the specific handler subworkflow.

### Condition evaluates incorrectly

| Symptom | Cause | Fix |
|---------|-------|-----|
| Always false | Pre-resolved literal not handled | Condition Handler should use `coerceNumeric` fallback |
| Branch not respected | `condition_branch` null on edges | Re-draw edges from ConditionNode handles in CMS canvas |
| Steps not skipped | `skippedStepIds` lost between iterations | Verify `$getWorkflowStaticData` is initialized and Process Step Result writes to it |

### All steps execute despite failure

| Check | Detail |
|-------|--------|
| Route by Step Type order | `failed` condition must be at index 0 (first check) |
| Skip Step node exists? | Must be in nodes array + connected from failed output |
| staticData working? | Prepare Current Step should read `state.failed` |

---

## Useful SQL Queries

```sql
-- Recent executions for a workflow
SELECT id, status, started_at, completed_at, error_message
FROM workflow_executions
WHERE workflow_id = 'YOUR_WORKFLOW_ID'
ORDER BY started_at DESC LIMIT 10;

-- Step executions with types
SELECT ws.step_type, wse.status, wse.started_at, wse.completed_at,
       wse.error_message, wse.output_payload
FROM workflow_step_executions wse
JOIN workflow_steps ws ON ws.id = wse.step_id
WHERE wse.execution_id = 'YOUR_EXECUTION_ID'
ORDER BY wse.started_at ASC;

-- Find a real response to test with
SELECT id, survey_link_id, created_at
FROM responses
WHERE tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953'
ORDER BY created_at DESC LIMIT 5;
```
