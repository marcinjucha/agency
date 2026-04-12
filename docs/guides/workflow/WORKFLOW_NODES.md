# Workflow Engine — Nodes & Triggers Reference

> Updated: 2026-04-12 | Architecture: [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md)

---

## Trigger Types

Triggers fire the workflow. Each trigger type defines a payload, maps it to initial variable context via `buildTriggerContext()`, and then the **Trigger Handler** subworkflow hydrates the context with real data from Supabase.

### `survey_submitted`

**Fired from:** `apps/website/features/survey/submit.ts` (fire-and-forget after response INSERT)

**Initial payload:**
```ts
{ responseId: string; surveyLinkId: string }
```

**After Trigger Handler hydration (available to all downstream steps):**

| Variable | Source | Description |
|----------|--------|-------------|
| `responseId` | trigger payload | UUID of the response |
| `surveyLinkId` | trigger payload | UUID of the survey link |
| `surveyTitle` | `surveys.title` | Name of the survey |
| `clientEmail` | `survey_links.notification_email` or `.client_email` | Notification recipient |
| `respondentName` | `responses.respondent_name` | Name if provided |
| `submittedAt` | `responses.created_at` | When survey was filled |
| `qaContext` | Built from `responses.answers` + `surveys.questions` | Full Q&A text for AI prompts |
| `answers` | `responses.answers` JSONB | Array of `{ questionText, answer, questionType }` |

**Data model:** Answers stored as `responses.answers` JSONB (`{ questionId: "answer" }`). Questions stored as `surveys.questions` JSONB (array). No separate tables.

---

### `booking_created`

**Fired from:** `apps/website/features/calendar/booking.ts` (fire-and-forget after appointment INSERT)

**Initial payload:**
```ts
{
  appointmentId: string
  responseId?: string
  surveyLinkId?: string
  clientEmail?: string
  appointmentAt?: string
}
```

**After Trigger Handler hydration:**

| Variable | Source | Description |
|----------|--------|-------------|
| `appointmentId` | trigger payload | UUID of the appointment |
| `appointmentAt` | `appointments.appointment_at` | Full datetime of booking |
| `clientEmail` | `appointments.client_email` | Client's email |
| `clientName` | `appointments.client_name` | Client's name |
| `notes` | `appointments.notes` | Optional notes |

---

### `lead_scored`

**Fired from:** n8n `Survey Response AI Analysis` workflow (after AI qualification completes)

**Initial payload (from n8n):**
```ts
{
  responseId: string
  score: number        // mapped to overallScore in context
  recommendation: string
  summary?: string
  analyzedAt?: string
}
```

**After Trigger Handler (passthrough — data already in payload):**

| Variable | Description |
|----------|-------------|
| `overallScore` | AI qualification score (0-10) |
| `recommendation` | `QUALIFIED` / `DISQUALIFIED` / `NEEDS_MORE_INFO` |
| `summary` | AI-generated text summary |
| `responseId` | UUID of the scored response |

> Note: n8n sends field `score`, but `buildTriggerContext()` maps it to `overallScore`.

---

### `manual`

**Fired from:** CMS TestModePanel or future manual trigger button

**After Trigger Handler:** `{ triggered: true }` (no data to fetch)

---

### `scheduled`

Planned — not yet implemented. Trigger Handler returns `{ triggered: true }`.

---

## Step Types

### `condition` (evaluated in n8n Condition Handler)

Evaluates an expression against the accumulated variable context. Routes downstream steps to `true` or `false` branch.

**step_config:**
```json
{ "type": "condition", "expression": "overallScore >= 7" }
```

**How it works:**
1. Prepare Current Step resolves `{{variables}}` in expression → `"7 >= 5"`
2. Condition Handler parses expression → `{ field: "7", operator: ">=", value: "5" }`
3. If field not found in context (because pre-resolved), treats as literal value
4. Returns `{ branch: "true" }` or `{ branch: "false" }`
5. Computes `skippedStepIds` for the non-taken branch

**Supported operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `in`

**condition_branch on edges:** CMS saves edges from ConditionNode with `sourceHandle` as `"true"` or `"false"`. This maps to `condition_branch` in `workflow_edges` table. The handler uses this to determine which steps to skip.

---

### `send_email` (n8n Send Email Handler)

Resolves email template, recipient, and variables, then calls the Send Email subworkflow (Resend).

**step_config:**
```json
{
  "type": "send_email",
  "template_id": "uuid",
  "to_expression": "{{clientEmail}}",
  "subject": "Confirmation",
  "html_body": "<p>Hello {{respondentName}}</p>"
}
```

**Handler flow:**
1. Parallel Supabase fetches: email_template (if template_id), response (if responseId), survey_link (if response)
2. Resolves recipient from `to_expression` or fallback to survey_link notification_email
3. Resolves `{{variables}}` in subject and html
4. Flattens payload → calls Send Email subworkflow
5. Error handling via `onError: continueErrorOutput`

---

### `delay` (n8n Delay Handler + native Wait node)

Pauses execution for a configured duration. Handler self-manages DB state.

**step_config:**
```json
{ "type": "delay", "value": 2, "unit": "hours" }
```

**Supported units:** `"minutes"` | `"hours"` | `"days"` (converted to seconds internally)

**Handler flow:**
1. Compute duration in seconds
2. PATCH step_execution = `waiting` + workflow_execution = `paused` (parallel)
3. n8n native Wait node sleeps (with `unit: "seconds"`)
4. After wake: PATCH step_execution = `completed` + workflow_execution = `running`
5. Returns `alreadyPersisted: true` → Orchestrator skips its own DB write

---

### `webhook` (n8n Webhook Handler)

Calls an external HTTP endpoint. Response merged into variable context.

**step_config:**
```json
{
  "type": "webhook",
  "url": "https://example.com/hook",
  "method": "POST",
  "body": "{\"id\": \"{{responseId}}\"}"
}
```

**SSRF protection:** Private IP regex blocklist (10.*, 172.16-31.*, 192.168.*, 127.*, localhost, ::1, *.local, 0.0.0.0, 169.254.*). Uses regex URL parsing — n8n sandbox lacks `URL` constructor.

**Timeout:** 10s hard limit on HTTP Request node.

---

### `ai_action` (n8n AI Action Handler)

Calls Claude via MiniMax Agent subworkflow. Parses structured JSON response.

**step_config:**
```json
{
  "type": "ai_action",
  "prompt": "Analyze this survey:\n{{qaContext}}",
  "output_schema": [
    { "key": "overallScore", "type": "number", "label": "Score" },
    { "key": "recommendation", "type": "string", "label": "Recommendation" }
  ]
}
```

**Handler flow:**
1. Build Prompt: formats prompt with context entries
2. Call MiniMax Agent subworkflow (Claude Haiku 4.5 via LangChain node)
3. Parse AI Result: find `content[].type === 'text'`, strip markdown code fences, parse JSON
4. Output schema keys become `{{overallScore}}`, `{{recommendation}}` in downstream steps

---

## n8n Handler Subworkflows

All handlers follow the same contract:

| Requirement | Detail |
|-------------|--------|
| Start node | `executeWorkflowTrigger` with `inputSource: "passthrough"` |
| Return shape | `{ json: { ...item, stepResult: { success, outputPayload? } } }` |
| Context preservation | `...item` spread in ALL return paths (success, error, catch) |
| Caller config | `autoMapInputData` + `convertFieldsToString: false` |

| Handler | Nodes | Pattern |
|---------|-------|---------|
| **Trigger** | 6 | Switch on trigger type → per-type Supabase fetch nodes |
| **Send Email** | 8 | Parallel DB fetches + payload flatten + error handling |
| **AI Action** | 4 | Build Prompt → Call MiniMax Agent → Parse Result |
| **Condition** | 2 | Expression evaluator + skip propagation |
| **Delay** | 4 | Compute duration → Wait node → Complete (self-manages DB) |
| **Webhook** | 6 | SSRF regex check → HTTP Request → Build Result |

---

## Visual Builder Components

| Component | Purpose |
|-----------|---------|
| `WorkflowCanvas.tsx` | ReactFlow canvas — nodes, edges, connections. Dynamic import (~150KB) |
| `nodes/node-registry.ts` | `NODE_TYPE_CONFIGS` — icon, label, border color per step type |
| `nodes/{Trigger,Action,Condition,Delay}Node.tsx` | Custom ReactFlow node components |
| `panels/ConfigPanelWrapper.tsx` | Routes selected node → correct config panel |
| `panels/{SendEmail,Condition,Delay,Webhook,AiAction,Trigger}ConfigPanel.tsx` | Per-type config forms |
| `StepLibraryPanel.tsx` | Drag-and-drop sidebar for adding steps |
| `TestModePanel.tsx` | Test execution with mock/real data |

**Canvas direction:** Left-to-right (Handle.Left = input, Handle.Right = output).

---

## Adding a New Step Type

1. **CMS `types.ts`** — add to `StepType` union + `StepConfig`
2. **CMS `validation.ts`** — add Zod schema
3. **CMS `node-registry.ts`** — add to `NODE_TYPE_CONFIGS`
4. **CMS `panels/`** — create config panel + register in `PANEL_REGISTRY`
5. **n8n** — create `Step - [Type] Handler.json` subworkflow
6. **n8n Orchestrator** — add branch in Route by Step Type Switch + Call Handler node + connection

---

## Adding a New Trigger Type

1. **CMS `types.ts`** — add to `TriggerType` union
2. **CMS `engine/types.ts`** — add `TriggerPayload` variant
3. **CMS `engine/utils.ts`** — add case in `buildTriggerContext()`
4. **CMS `lib/trigger-schemas.ts`** — add variable schema (must match Trigger Handler output)
5. **CMS trigger-config panel** — create UI
6. **n8n Trigger Handler** — add Code node for the type + Switch branch
7. **Caller feature** — add fire-and-forget POST to `/api/workflows/trigger`

> Always update `trigger-schemas.ts` to match what the Trigger Handler actually produces.
