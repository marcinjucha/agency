# Workflow Engine — Nodes & Triggers Reference

> For architecture, flow diagrams, and DB schema see [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md)

---

## Trigger Types

Triggers fire the workflow. Each trigger type has a defined payload and maps payload fields to variable context via `buildTriggerContext()` in `engine/utils.ts`.

### `survey_submitted`

**Fired from:** `apps/website/features/survey/submit.ts` (fire-and-forget after response INSERT)

**Payload:**
```ts
{ responseId: string; surveyLinkId: string }
```

**Variable context:**
```
responseId, surveyLinkId
```

---

### `booking_created`

**Fired from:** `apps/website/features/calendar/booking.ts` (fire-and-forget after appointment INSERT)

**Payload:**
```ts
{
  appointmentId: string
  responseId: string
  surveyLinkId?: string
  clientEmail?: string
  appointmentAt?: string  // ISO datetime
}
```

**Variable context:**
```
appointmentId, responseId, surveyLinkId, clientEmail, appointmentAt
```

---

### `lead_scored`

**Fired from:** n8n `Survey Response AI Analysis` workflow — HTTP Request node after `Update Response with summary`.

**n8n HTTP Request config:**
- URL: `$env.CMS_INTERNAL_URL + /api/workflows/trigger`
- `specifyBody: "string"` + `JSON.stringify({...})` (required for nested objects in n8n)
- `neverError: true`, timeout 10000

**Payload (from n8n):**
```ts
{
  responseId: string
  score: number        // mapped to overallScore in context
  recommendation: string
  summary?: string
  analyzedAt?: string
}
```

**Variable context:**
```
responseId, overallScore, recommendation, summary, analyzedAt
```

> Note: n8n sends field `score`, but `buildTriggerContext()` maps it to `overallScore` in the variable context. Condition expressions must use `overallScore`, not `score`.

---

### `manual`

**Fired from:** CMS (future: manual trigger button)

**Payload:** `{}`

---

### `scheduled`

Planned — not yet implemented.

---

## Step Types

### `condition` (sync)

Evaluates an expression against the current variable context. Routes to `true` or `false` edge.

**step_config:**
```json
{ "type": "condition", "expression": "overallScore >= 7" }
```

**Supported operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `in`

**Field name syntax:** Use bare names (`overallScore`). The evaluator also accepts `{{overallScore}}` (strips `{{}}` automatically — users copy from email template fields).

**No `eval()`** — expressions are parsed manually. Fail-closed on parse error.

---

### `send_email` (async/n8n)

Dispatches to n8n. n8n fetches the email template by `templateId`, resolves `{{variables}}` from context, sends via Resend.

**step_config:**
```json
{
  "type": "send_email",
  "templateId": "uuid",
  "to_expression": "{{clientEmail}}"
}
```

---

### `delay` (async/DB)

Pauses execution for a defined duration. Does **not** dispatch to n8n — handled by CMS + DB. See [Delay Step Architecture](./WORKFLOW_ENGINE.md#delay-step-architecture-aaa-t-150).

**step_config:**
```json
{ "type": "delay", "value": 2, "unit": "days" }
```

Supported units: `"minutes"` | `"hours"` | `"days"`

---

### `webhook` (sync)

Calls an external HTTP endpoint synchronously. Response is merged into variable context.

**step_config:**
```json
{
  "type": "webhook",
  "url": "https://example.com/hook",
  "method": "POST",
  "headers": {},
  "body_template": "{\"id\": \"{{responseId}}\"}"
}
```

SSRF protection: private IP ranges blocked before `fetch()`. Timeout: 10s.

---

### `ai_action` (async/n8n)

Dispatches to n8n for Claude API call. Result merged into variable context.

**step_config:**
```json
{
  "type": "ai_action",
  "prompt_template": "Analyze this response: {{responseId}}"
}
```

---

## Visual Builder Components

| Component | Purpose |
|-----------|---------|
| `WorkflowCanvas.tsx` | ReactFlow canvas — nodes, edges, connections. Dynamic import (~150KB) |
| `nodes/node-registry.ts` | `NODE_TYPE_CONFIGS` — icon, label, border color per step type |
| `nodes/{Trigger,Action,Condition,Delay}Node.tsx` | Custom ReactFlow node components |
| `panels/ConfigPanelWrapper.tsx` | Routes selected node → correct config panel (PANEL_REGISTRY) |
| `panels/{SendEmail,Condition,Delay,Webhook,AiAction,Trigger}ConfigPanel.tsx` | Per-type config forms |

**Canvas direction:** Left-to-right (Handle.Left = input, Handle.Right = output). Matches n8n mental model.

---

## Adding a New Step Type

1. **`types.ts`** — add to `StepType` union + `StepConfig` discriminated union + label
2. **`validation.ts`** — add Zod schema for the config
3. **`engine/action-handlers.ts`** — add handler to `stepHandlers` registry
4. **`components/nodes/node-registry.ts`** — add to `NODE_TYPE_CONFIGS`
5. **`components/panels/`** — create config panel + register in `PANEL_REGISTRY`

5 files, no changes to executor or canvas logic.

---

## Adding a New Trigger Type

1. **`types.ts`** — add to `TriggerType` union + `TriggerConfig` union + label
2. **`validation.ts`** — add Zod schema
3. **`engine/types.ts`** — add to `TriggerPayload` discriminated union
4. **`engine/utils.ts`** — add case in `buildTriggerContext()` (maps payload fields → variable context keys)
5. **Caller** — add fire-and-forget POST to `/api/workflows/trigger` from the event source

> Always document the variable context keys here after adding a new trigger.
