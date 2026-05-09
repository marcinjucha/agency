# AAA-T-63 Iter A — Survey Pipeline Map (booking-triggered workflows prep)

Read-only architecture map of the **survey_submitted** end-to-end pipeline as the reference pattern for adding **booking_created** workflow attachment via UI.

Working dir: `/Users/marcinjucha/Prywatne/projects/legal-mind/worktree-aaa-t-63-booking-triggered-workflows`

---

## TL;DR — Three load-bearing findings

1. **`booking_created` is already wired end-to-end at the engine level.** Trigger type is registered, n8n Orchestrator handles it via universal pass-through context, payload includes `appointmentId`/`responseId`/`surveyLinkId`/`clientEmail`/`appointmentAt`, the booking server fn (`apps/website/features/calendar/booking.ts:236-255`) ALREADY fires `POST /api/workflows/trigger` with `trigger_type: 'booking_created'`. **The missing piece is purely the attachment UI** — no way for a user to pick *which* workflow runs on booking. Today the booking trigger fires NOTHING because no row in any table binds a workflow to a survey/survey_link for the booking event.

2. **Workflow attachment lives on `survey_links`, not `surveys`.** Migration `20260414000000_add_survey_link_workflow_id.sql` added a single nullable `survey_links.workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL`. A SurveyLinks row is the unit that binds (link → workflow). For `booking_created` we either reuse the same column (one workflow per link, regardless of trigger event) or add a second column / second linkage table.

3. **Existing step types are SURVEY-DOMAIN-SPECIFIC and reusable for bookings.** `get_response`, `get_survey_link`, `update_response` all take the relevant ID via `{{variableContext.X}}` expressions. For booking workflows the user can already drop a `get_response` step (because booking_created carries `responseId`) and a `get_survey_link` step (because booking_created carries `surveyLinkId`). **No new step type is needed** if a "Pobierz spotkanie" step is not a strict requirement for the iteration. If it is, a new `get_appointment` step type must be added in 4 places (registry, validation, panels, n8n handler).

---

## 1. Step Type Registry

Single source of truth: **`apps/cms/features/workflows/step-registry.ts`** (`STEP_REGISTRY` array, `defineStep()` factory). `StepType` is derived: `(typeof STEP_REGISTRY)[number]['id']`.

| Step type | Defined | Validated | Frontend config panel | n8n handler subworkflow | Domain-bound? |
|---|---|---|---|---|---|
| `send_email` | `step-registry.ts:74-85` | `validation.ts:95-102` (`sendEmailConfigSchema`) | `components/panels/SendEmailConfigPanel.tsx` | `n8n-workflows/workflows/Workflows/Step - Send Email Handler.json` | Generic (template_id + to_expression) |
| `ai_action` | `step-registry.ts:87-100` | `validation.ts:177-188` (`aiActionConfigSchema`) | `components/panels/AiActionConfigPanel.tsx` | `Step - AI Action Handler.json` | Generic |
| `switch` | `step-registry.ts:102-118` | `validation.ts:104-142` (`switchConfigSchema`) | `components/panels/SwitchConfigPanel.tsx` | `Step - Switch Handler.json` | Generic |
| `delay` | `step-registry.ts:120-128` | `validation.ts:144-154` (`delayConfigSchema`) | `components/panels/DelayConfigPanel.tsx` | `Step - Delay Handler.json` | Generic |
| `webhook` | `step-registry.ts:130-141` | `validation.ts:161-169` (`webhookConfigSchema`) | `components/panels/WebhookConfigPanel.tsx` | `Step - Webhook Handler.json` | Generic |
| `get_response` | `step-registry.ts:143-163` | `validation.ts:190-193` (`getResponseConfigSchema`) | `components/panels/GetResponseConfigPanel.tsx` | `Step - Get Response Handler.json` | **Survey-domain** (reads `responses` table) |
| `update_response` | `step-registry.ts:165-176` | `validation.ts:195-205` (`updateResponseConfigSchema`) | `components/panels/UpdateResponseConfigPanel.tsx` | `Step - Update Response Handler.json` | **Survey-domain** (writes `responses.ai_qualification` etc.) |
| `get_survey_link` | `step-registry.ts:178-190` | `validation.ts:207-210` (`getSurveyLinkConfigSchema`) | `components/panels/GetSurveyLinkConfigPanel.tsx` | `Step - Get Survey Link Handler.json` | **Survey-domain** (reads `survey_links`) |

### Are existing fetch steps parameterized?
**No — they are hardcoded to a domain.** `get_response` always queries `responses` table and assumes `responseId` semantics. Its config field is literally `responseIdExpression` (string template like `{{responseId}}`). There is no `resource_type: 'response' | 'appointment'` parameter. The handler subworkflow's Fetch Response Data Code node hard-codes `responses?id=eq.${responseId}` SELECTs.

→ **Implication:** if the booking workflow needs to display appointment-only fields (e.g., `appointment.notes`, `appointment.start_time`, calendar provider), a NEW `get_appointment` step type is required. If the iteration scope is "booking workflow can read survey response + survey link only" (because both IDs come on the trigger payload), the existing 8 step types are sufficient.

### Visual reference (canvas screenshot) → real names

| Screenshot label | Real step_type | Notes |
|---|---|---|
| "Formularz wysłany" (WYZWALACZ) | trigger node, `trigger_type='survey_submitted'` | Trigger isn't a step row — see §2 |
| "Pobierz odpowiedź" | `get_response` | reads `responses` |
| "Pobierz link ankiety" | `get_survey_link` | reads `survey_links` joined to `surveys` |
| "Analiza AI" | `ai_action` | calls MiniMax Agent subworkflow |
| "Zapis analizy AI" | `update_response` | writes back to `responses` |
| "Wyślij email" | `send_email` | template_id + to_expression |

---

## 2. Trigger Type Registry

`TriggerType` is **NOT in `STEP_REGISTRY`** — it's a hand-maintained string union duplicated across files. **This is the known 4-files tech debt.**

Single canonical declaration: `apps/cms/features/workflows/types.ts:70`
```ts
export type TriggerType = 'survey_submitted' | 'booking_created' | 'lead_scored' | 'manual' | 'scheduled'
```

| Trigger type | Validated | Frontend panel | n8n handler | Variables exposed |
|---|---|---|---|---|
| `survey_submitted` | `validation.ts:59-62` (`triggerConfigSurveySubmittedSchema`, optional `survey_id`) | `components/panels/TriggerConfigPanel.tsx` | `Step - Trigger Handler.json` (no-op pass-through) | `responseId`, `surveyLinkId` (`lib/trigger-schemas.ts:57-72`) |
| `booking_created` | `validation.ts:64-66` (empty config) | TriggerConfigPanel (same) | Same Trigger Handler (no-op) | `clientName`, `clientEmail`, `appointmentAt`, `notes`, `appointmentId`, `companyName` (`lib/trigger-schemas.ts:74-117`) |
| `lead_scored` | `validation.ts:68-76` | TriggerConfigPanel | Same | `overallScore`, `recommendation`, `summary`, `responseId`, `companyName` |
| `manual` | `validation.ts:78-80` | TriggerConfigPanel | Same | `companyName` only |
| `scheduled` | `validation.ts:82-84` | TriggerConfigPanel | Same | `companyName` only |

**Trigger Handler is a NO-OP.** `Step - Trigger Handler.json` `Pass Through` node literally returns input unchanged with `stepResult: { success: true, outputPayload: {} }`. Trigger payload becomes `variableContext` directly; downstream `get_*` steps do the actual hydration. Comment in code: *"Trigger step is a no-op for execution — initial variable context comes from orchestrator's buildTriggerContext(triggerPayload)."*

---

## 3. Workflow Attachment to Survey

### Data model
- **Column:** `survey_links.workflow_id UUID NULL REFERENCES workflows(id) ON DELETE SET NULL`
- Migration: `supabase/migrations/20260414000000_add_survey_link_workflow_id.sql`
- Index: `idx_survey_links_workflow_id WHERE workflow_id IS NOT NULL` (partial)
- **NOT on `surveys` table.** Each survey_link (= each shareable URL token) gets its own optional workflow binding. One survey can spawn N links, each pointing at different workflows.

### CMS UI
- File: `apps/cms/features/surveys/components/SurveyLinks.tsx`
- Picker rendered in BOTH the "create new link" form (`SurveyLinks.tsx:379-381`) and "edit link" form (`SurveyLinks.tsx:603-605`)
- Picker component is `WorkflowPicker` (in same file, ~line 60-110; combobox + workflows list)
- Display in list row: `WorkflowDisplay` (`SurveyLinks.tsx:43-58`, `:645`)

### Form schema / validation / server action
- Zod: `apps/cms/features/surveys/validation.ts:35` (createSurveyLinkSchema) and `:55` (updateSurveyLinkSchema) — both have `workflowId: z.string().uuid().nullable().optional()`
- Server fn: `apps/cms/features/surveys/server.ts`
  - Create: `:151-160` accepts `workflowId`, then `:172-173` runs `verifyWorkflowAccess(auth, workflowId)` (RLS check that the workflow belongs to this tenant), then inserts row with `workflow_id` (`:327`)
  - Update: `:346-361` analogous
  - `verifyWorkflowAccess` helper at `:286-297`

### How it's read on submission
- `apps/website/features/survey/server.ts:128-141` — `submitResponseFn` does `supabase.from('survey_links').select('workflow_id, surveys!inner(tenant_id)').eq('id', linkId).single()` → if `workflow_id IS NOT NULL`, fires the trigger

---

## 4. Trigger → Execution Data Flow

### Submit path (survey_submitted)

```
[Browser] survey form submit
  ↓ POST createServerFn
[Website] submitResponseFn   apps/website/features/survey/server.ts:123-199
  ↓ INSERT into responses
  ↓ if survey_links.workflow_id != null:
  ↓   setTimeout(500ms, () => fetch(`${CMS_BASE_URL}/api/workflows/trigger`, {
  ↓     trigger_type: 'survey_submitted',
  ↓     workflow_id, tenant_id (informational),
  ↓     payload: { responseId, surveyLinkId }
  ↓   }))      // fire-and-forget
[CMS]    POST /api/workflows/trigger   apps/cms/app/routes/api/workflows/trigger.ts
  ↓ Bearer ${WORKFLOW_TRIGGER_SECRET} auth
  ↓ Zod parse
  ↓ fetchWorkflowForPublicTrigger(supabase, workflow_id, trigger_type)
  ↓     → handlers.server.ts:419-449 — verifies row exists, is_active, trigger_type matches
  ↓     → returns AUTHORITATIVE tenantId from workflow row (caller's tenant_id is ignored)
  ↓ validateSurveyLinkIdInPayload(supabase, trigger_type, payload, tenantId)
  ↓     → trigger-payload-validators.ts — defense-in-depth: surveyLinkId must be id (not token), must belong to tenant
  ↓ dispatchToN8n(N8N_WORKFLOW_ORCHESTRATOR_URL, workflow_id, tenantId, { trigger_type, ...payload })
  ↓     → handlers.server.ts ~388-409 — POST with Bearer ${ORCHESTRATOR_WEBHOOK_SECRET}
[n8n]   Workflow Orchestrator   n8n-workflows/workflows/Workflows/Workflow Orchestrator.json
  ↓ Webhook → Sentry Init → Validate Auth (Bearer check, extract workflowId/tenantId/triggerPayload)
  ↓ Fetch and Initialize (single Code node):
  ↓     - 3 Supabase REST calls (workflow row, workflow_steps, workflow_edges)
  ↓     - filter trigger steps (step_type matches a trigger type)
  ↓     - INSERT workflow_executions row
  ↓     - INSERT N workflow_step_executions rows (one per non-trigger step)
  ↓     - topologicalSort(steps, edges) (Kahn's algorithm)
  ↓     - buildTriggerContext(triggerType, triggerPayload) → UNIVERSAL PASS-THROUGH ({...payload, trigger_type})
  ↓ Respond 202 Accepted (executionId returned to CMS, which returns it to website)
  ↓ Loop Over Steps (SplitInBatches over sortedSteps array)
  ↓   → Call Process Step subworkflow (executeWorkflow)
  ↓        → Workflow Process Step.json:
  ↓             Prepare Current Step → Mark Step Running →
  ↓             Route by Step Type (Switch with cases for each step_type) →
  ↓               send_email | ai_action | webhook | switch | delay |
  ↓               get_response | update_response | trigger | get_survey_link | __skipped__ | __replay__
  ↓             → Process Step Result → return to Orchestrator
  ↓   → Orchestrator updates workflow_step_executions row (status, output_payload)
  ↓ Mark Execution Complete (after loop)
```

### Key files / line refs
- Website fire: `apps/website/features/survey/server.ts:170-187`
- CMS API entry: `apps/cms/app/routes/api/workflows/trigger.ts:48-131`
- Authoritative-tenant lookup: `apps/cms/features/workflows/handlers.server.ts:419-449`
- surveyLinkId defense: `apps/cms/features/workflows/trigger-payload-validators.ts:24-64`
- Dispatch to n8n: `apps/cms/features/workflows/handlers.server.ts:388-410`
- n8n entry: `n8n-workflows/workflows/Workflows/Workflow Orchestrator.json` → "Validate Auth" + "Fetch and Initialize" Code nodes
- Step routing: `n8n-workflows/workflows/Workflows/Workflow Process Step.json` → "Route by Step Type" Switch

### Booking path (booking_created) — already wired
**Identical shape**, different caller:
- `apps/website/features/calendar/booking.ts:236-255` POSTs the SAME `/api/workflows/trigger` endpoint with:
  ```ts
  trigger_type: 'booking_created',
  tenant_id, // from booking row
  payload: { appointmentId, responseId, surveyLinkId, clientEmail, appointmentAt }
  ```
- **Critical missing piece:** there is NO `workflow_id` in the booking payload. Compare to survey path which reads `survey_links.workflow_id` to choose the workflow. The booking trigger fires with no workflow target → CMS endpoint requires `workflow_id` (`triggerEndpointSchema.z.object({ workflow_id: z.string().uuid() })` — `trigger.ts:31`) → **booking trigger ALWAYS 400s today.** This is the bug AAA-T-63 fixes.

---

## 5. Context Hydration

### How `pobierz_odpowiedz` (get_response) actually fetches
- File: `n8n-workflows/workflows/Workflows/Step - Get Response Handler.json`, `Fetch Response Data` Code node
- **Direct Supabase REST via inlined `supabaseRequest()` helper** (`https.request` to `${SUPABASE_URL}/rest/v1/...`, service-role auth via `$env.SUPABASE_SERVICE_ROLE_KEY`)
- **Does NOT call any CMS server fn.** All hydration in n8n's process.
- Input shape (from Orchestrator): `{ resolvedConfig: { responseIdExpression: '<resolved-id>' }, variableContext: {...trigger payload}, tenantId, currentStepExecId, ... }`
- ID resolution: `resolvedConfig.responseIdExpression ?? variableContext.responseId` (Orchestrator pre-resolves `{{responseId}}` template before invoking handler)
- Output (10 fields): `responseId`, `status`, `respondentName`, `createdAt`, `surveyTitle`, `clientEmail`, `answers` (object), `qaContext` (Q&A flat string), `companyName`, `aiQualification`, `responseUrl`. Also writes `input_payload: {responseId, tenant_id}` to `workflow_step_executions` for audit.
- **Tenant filter applied** on the responses fetch (`responses?id=eq.<id>&tenant_id=eq.<tenantId>`)

### How `pobierz_link_ankiety` (get_survey_link) fetches
- File: `n8n-workflows/workflows/Workflows/Step - Get Survey Link Handler.json`, `Fetch Survey Link Data` Code node
- Same pattern: `supabaseRequest()` direct REST
- Input: `resolvedConfig.surveyLinkIdExpression ?? variableContext.surveyLinkId`
- Output (3 fields): `notificationEmail`, `token`, `surveyTitle` (joined from `surveys`)
- Same Save Input Payload audit step writes `{surveyLinkId, tenant_id}` to step exec row

---

## 6. Extension Points — adding `booking_created` ATTACHMENT (UI)

> Engine-level support is already present. This section enumerates what must change in the **attachment / UI** layer.

### Two-pronged decision tree
**(A) Reuse existing `survey_links.workflow_id` column** — one workflow per link covers BOTH events. Workflow's own `trigger_type` discriminates. Picker stays a single dropdown.

**(B) Add second column** — `survey_links.booking_workflow_id` so a single link can fire one workflow on submit AND a different workflow on booking.

The user prompt says *"po wypełnieniu ankiety i dodaniu spotkania, workflow zostanie wywołane"* — singular "workflow". (A) is simpler and matches the prompt; (B) is more flexible but doubles UI surface. **Recommendation: (A) for iteration A, leave (B) as future extension if a real use case lands.**

### Files that MUST change for booking_created end-to-end (path A)

Ordered by dependency:

| # | File | Change |
|---|---|---|
| 1 | `apps/website/features/calendar/booking.ts:236-255` | Read `survey_links.workflow_id` (and verify the workflow's `trigger_type === 'booking_created'`), include `workflow_id` in trigger POST body. Today the body has no `workflow_id` so endpoint rejects. |
| 2 | `apps/cms/features/workflows/trigger-payload-validators.ts` | Already handles `booking_created` (line 14: `SURVEY_TRIGGER_TYPES = new Set(['survey_submitted', 'booking_created'])`) — **no change needed**. |
| 3 | UI clarity in `apps/cms/features/surveys/components/SurveyLinks.tsx` | Optional: show in WorkflowPicker which trigger types are eligible / which event will fire (label hint near the picker). Today picker shows all workflows regardless of trigger_type. |
| 4 | `apps/website/features/calendar/__tests__/booking.test.ts` | Update mock + assertion (`:452` already asserts URL; need to assert workflow_id is forwarded). |

### What NOT to change (already correct)
- `apps/cms/app/routes/api/workflows/trigger.ts` — already validates `trigger_type` against the 5-value enum incl. `booking_created`
- `apps/cms/features/workflows/handlers.server.ts:fetchWorkflowForPublicTriggerHandler` — already enforces `workflow.trigger_type === triggerType`
- `n8n-workflows/workflows/Workflows/Workflow Orchestrator.json` — universal pass-through `buildTriggerContext` already handles arbitrary trigger types
- `apps/cms/features/workflows/engine/utils.ts:buildTriggerContext` — already has `case 'booking_created'` (test-mode path; n8n production path uses pass-through)
- `apps/cms/lib/trigger-schemas.ts` — `booking_created` variables already declared (lines 74-117)
- All step types: existing `get_response`, `get_survey_link`, `send_email`, `ai_action`, `update_response` work as-is for booking workflows because `booking_created` payload includes `responseId` and `surveyLinkId`

### Open question for user
The existing `survey_links.workflow_id` is currently named generically. If we adopt path (A) we should add a **comment** that "this workflow fires on whatever event matches the workflow's trigger_type". If a single link should support BOTH events with potentially different workflows (path B), we need a migration adding `booking_workflow_id` and corresponding column-pair UI.

---

## 7. Known Tech Debt — `trigger_type` Duplicated Across Files

The hand-maintained `'survey_submitted' | 'booking_created' | 'lead_scored' | 'manual' | 'scheduled'` string union appears verbatim or as a Set/array of literals in:

| # | File:line | Form |
|---|---|---|
| 1 | `apps/cms/features/workflows/types.ts:70` | `export type TriggerType = ...` (canonical) |
| 2 | `apps/cms/features/workflows/validation.ts:43-49` | `TRIGGER_TYPES_FOR_CANVAS` const-tuple + `:245` `z.enum([...])` in `createWorkflowSchema` |
| 3 | `apps/cms/features/workflows/components/panels/index.ts:44-50` | `TRIGGER_TYPES = new Set([...])` for panel routing |
| 4 | `apps/cms/features/workflows/components/nodes/node-registry.ts:94-125` | `TRIGGER_SUBTYPE_CONFIGS: Record<TriggerType, NodeTypeConfig>` (5 hand-written entries) |
| 5 | `apps/cms/app/routes/api/workflows/trigger.ts:21-27` | `z.enum([...])` in `triggerEndpointSchema` |
| 6 | `apps/cms/features/workflows/types.ts:288-294` | `TRIGGER_TYPE_LABELS: Record<TriggerType, string>` (5 entries) |
| 7 | `apps/cms/features/workflows/trigger-payload-validators.ts:14` | `SURVEY_TRIGGER_TYPES = new Set([...])` — only `survey_submitted` and `booking_created` (subset) |
| 8 | `apps/cms/lib/trigger-schemas.ts:18` | `TRIGGER_VARIABLE_SCHEMAS: Record<string, ...>` keyed by string — implicit duplication |
| 9 | `apps/cms/features/workflows/engine/types.ts:20,26,35,44,48` | `TriggerPayload` discriminated union arms |
| 10 | `apps/cms/features/workflows/engine/utils.ts:254-289` | `switch (triggerPayload.trigger_type)` cases |

**Memory.md's "4 files" is outdated** — real count is 10+. Adding a new trigger type today touches all of them; missing one = silent breakage at the missed layer. A `TRIGGER_REGISTRY` mirroring `STEP_REGISTRY` would unify (1)/(4)/(6)/(8) into a single source. The Zod enum in (2)/(5) and the discriminated union in (9) can be derived from that registry. (7)'s subset filter would become a per-trigger-definition flag like `requires_survey_context: true`.

**For AAA-T-63 specifically:** the 5 trigger types are stable for this iteration. The registry refactor is NOT a blocker — booking_created already exists in all 10 places. Document the debt but do not touch it as part of T-63 unless the user explicitly requests.

### Other relevant duplication
- **Step-routing Switch in n8n** (`Workflow Process Step.json` "Route by Step Type") — every new step type adds a Switch case + an Execute Workflow node + a connection. Not extensible without manual JSON editing. Tooling gap (`n8n-builder.mjs add-switch-case`) noted in `memory.md` "Tooling Gaps".

---

## Extension Impact for `booking_created` (Path A — minimal)

Files to edit, dependency-ordered:

1. **`apps/website/features/calendar/booking.ts:236-255`** — fetch `survey_links.workflow_id` (filter to workflows with `trigger_type='booking_created'`), include `workflow_id` in trigger body, skip dispatch if null. Reuse the timing pattern already in `submitResponseFn` (verify the just-inserted appointment row is visible, or no setTimeout — booking is synchronous on the same connection so no PgBouncer race risk).
2. **`apps/website/features/calendar/__tests__/booking.test.ts:452`** — assert `workflow_id` in dispatched body; add cases for "no workflow bound → no dispatch" and "workflow has wrong trigger_type → server returns 404, dispatch silently fails" (fire-and-forget — no test failure).
3. *(Optional UX)* **`apps/cms/features/surveys/components/SurveyLinks.tsx`** WorkflowPicker — surface the workflow's `trigger_type` next to the name, and/or filter to two compatible types (`survey_submitted`, `booking_created`). Decision deferred to design review.
4. *(Future, NOT this iteration)* — if path B is later required, schema migration `survey_links.booking_workflow_id` + verifyWorkflowAccess in surveys server.ts + dual picker UI in SurveyLinks.tsx + booking.ts reads the new column.

No changes to: workflows engine, step-registry, validation schemas, n8n Orchestrator, n8n Process Step routing, n8n step handlers, trigger-schemas, types, panels.
