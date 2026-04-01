# Workflow Engine — E2E Manual Test Guide

Manual test documentation for the full workflow execution path:
survey form submission → trigger → execution logs → email delivery.

---

## Prerequisites

### Environment Variables (CMS — `apps/cms/.env.local`)

```bash
WORKFLOW_TRIGGER_SECRET=<shared-secret>     # Used by trigger + callback routes
HOST_URL=http://localhost:3001              # CMS base URL (website→CMS + n8n callbacks)
N8N_WORKFLOW_EXECUTOR_URL=https://n8n.trustcode.pl/webhook/workflow-executor
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Environment Variables (Website — `apps/website/.env.local`)

```bash
HOST_URL=http://localhost:3001              # Points to CMS for trigger dispatch
WORKFLOW_TRIGGER_SECRET=<same-shared-secret>
```

### Services Running

- CMS: `npm run dev:cms` (http://localhost:3001)
- Website: `npm run dev:website` (http://localhost:3000)
- n8n: running and reachable at `N8N_WORKFLOW_EXECUTOR_URL`
- Supabase: local or linked remote

---

## Test Path 1: survey_submitted trigger (form_confirmation template)

### Step 1 — Create workflow from template

1. Open CMS at http://localhost:3001
2. Navigate to **Workflow** in sidebar
3. Click **Pokaż szablony** to reveal the template section
4. Find **Potwierdzenie formularza** and click **Użyj szablonu**
5. Workflow is created (inactive). You are navigated to the workflow detail page.

Expected: Workflow appears in list with trigger badge "Formularz wysłany", status inactive.

### Step 2 — Inspect canvas

1. Click **Otwórz edytor** on the workflow detail page
2. Verify canvas shows:
   - Trigger node: **Formularz wysłany** (survey_submitted)
   - Condition node: `overallScore >= 7`
   - Send Email node connected to condition's "true" branch

### Step 3 — Activate the workflow

1. Return to workflow detail page
2. Toggle **Aktywny** switch to active
3. Verify status badge changes to **Aktywny**

### Step 4 — Submit survey on website

1. Open website at http://localhost:3000
2. Navigate to a survey link (get URL from CMS → Ankiety → link list)
3. Fill out the survey with answers that produce `overallScore >= 7`
4. Submit the form

Expected server log (CMS): `[trigger] survey_submitted → found N matching workflows`

### Step 5 — Check execution logs in CMS

1. Navigate to **Workflow → Historia wykonań** in CMS sidebar
2. Find the execution for your workflow (most recent, trigger: Formularz wysłany)
3. Click the execution row to open detail view

Expected execution states in order:
- `pending` — initial state before engine picks up
- `running` — engine started processing
- `completed` — all steps finished (or `failed` if condition blocked)

Expected step states:
- Condition step: `completed`, output: `{ "branch": "true" }` (if score >= 7)
- Send Email step: `running` (dispatched to n8n, waiting callback) → `completed` after callback

### Step 6 — Verify email in Resend dashboard

1. Open Resend dashboard at https://resend.com (or your configured provider)
2. Look for an email sent to the address from the survey link's `client_email`
3. Verify subject and body match the workflow's email template

---

## Test Path 2: booking_created trigger (booking_notification template)

### Steps

1. Create workflow from **Powiadomienie o rezerwacji** template
2. Activate the workflow
3. Open website calendar booking flow and complete a booking
4. Check CMS execution logs → should show single send_email step
5. Verify confirmation email in Resend

Expected step states: `send_email` → `running` → `completed`

---

## Test Path 3: lead_scored trigger (follow_up template)

### Steps

1. Create workflow from **Follow-up po kwalifikacji** template
2. Activate the workflow
3. Submit a survey — n8n runs AI qualification and POSTs to `/api/workflows/trigger` with `trigger_type: lead_scored`
4. Check CMS execution logs

Expected step states:
- Condition (`overallScore >= 5`): `completed`, branch: `true`
- Delay (`2 days`): `completed` (async), execution status: `paused`
- After 2 days (or after manually advancing via n8n cron): Send Email step: `running` → `completed`

---

## Troubleshooting

### Workflow not triggered

**Symptom:** Survey submitted but no execution appears in logs.

**Check:**
1. Is the workflow `is_active = true`?
2. Does `trigger_type` on the workflow row match the event? (Check DB: `SELECT trigger_type, is_active FROM workflows WHERE id = 'X'`)
3. Is `WORKFLOW_TRIGGER_SECRET` set and matching in both CMS and website `.env.local`?
4. Check CMS server logs for `[trigger]` prefix entries

### n8n unreachable

**Symptom:** Send Email step stays in `running` status indefinitely; no callback arrives.

**Check:**
1. Is n8n running? Ping `N8N_WORKFLOW_EXECUTOR_URL`
2. Is `HOST_URL` reachable from n8n? (For local dev, n8n on VPS cannot reach localhost — use ngrok or deploy CMS to staging)
3. Check n8n execution log for the generic executor workflow

### Email not sent

**Symptom:** Execution shows `completed` but no email received.

**Check:**
1. `email_configs` table: does the tenant have an active email config? (`SELECT * FROM email_configs WHERE tenant_id = 'X'`)
2. If empty: n8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`) — check Resend dashboard under that sender
3. Was `to_expression` in the send_email step config correctly resolved? Check `output_payload` on the step execution in logs

### Execution shows `failed`

**Symptom:** Execution status = `failed`, step shows error.

**Check:**
1. Open execution detail in CMS → expand step error message
2. Common causes:
   - MAX_STEPS exceeded (more than 50 steps in workflow)
   - Condition step timed out (expression took > 5 minutes — unlikely, check for infinite loops)
   - Webhook step timed out (external URL unreachable or slow)
   - n8n dispatch failed (check `N8N_WORKFLOW_EXECUTOR_URL` env var)

### Condition step evaluates to wrong branch

**Symptom:** Email sent when it shouldn't be, or not sent when it should.

**Check:**
1. Open execution detail → condition step output: `{ "branch": "true" | "false" }`
2. Check `input_payload` on the condition step to see what variables were available
3. Verify expression syntax: field name (no `{{ }}` wrapper), operator, value
   - Correct: `overallScore >= 7`
   - Wrong: `{{overallScore}} >= 7` (mustache syntax not supported in expressions)

---

## Expected Execution State Transitions

```
Trigger received
  ↓
workflow_executions: status = 'running'
  ↓
workflow_step_executions: all steps = 'pending'
  ↓
Condition step executed (sync)
  → status: 'pending' → 'running' → 'completed'
  ↓
Send Email dispatched to n8n (async)
  → step status: 'pending' → 'running'  (stays running until callback)
  → execution status: 'waiting_for_callback'
  ↓
n8n calls /api/workflows/callback
  → step status: 'running' → 'completed'
  → execution status: 'completed'
```

---

## Useful SQL Queries

Check recent executions for a workflow:

```sql
SELECT id, status, started_at, completed_at, error_message
FROM workflow_executions
WHERE workflow_id = 'YOUR_WORKFLOW_ID'
ORDER BY started_at DESC
LIMIT 10;
```

Check step executions for a specific execution:

```sql
SELECT
  ws.step_type,
  wse.status,
  wse.started_at,
  wse.completed_at,
  wse.error_message,
  wse.output_payload
FROM workflow_step_executions wse
JOIN workflow_steps ws ON ws.id = wse.step_id
WHERE wse.execution_id = 'YOUR_EXECUTION_ID'
ORDER BY wse.started_at ASC;
```

Verify workflow is active and has matching trigger:

```sql
SELECT id, name, trigger_type, is_active
FROM workflows
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND trigger_type = 'survey_submitted'
  AND is_active = true;
```
