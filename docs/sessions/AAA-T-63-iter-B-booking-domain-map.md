# AAA-T-63 Iter B — Booking Domain Map + Verification of Iter A

Read-only verification of Iter A's load-bearing claims, mapping of the booking creation domain, and identification of gaps for Path B (dual workflow attachment per survey_link).

Working dir: `/Users/marcinjucha/Prywatne/projects/legal-mind/worktree-aaa-t-63-booking-triggered-workflows`

---

## Task 1 — Verification of Iter A Load-Bearing Claims

### (a) `booking.ts:236-255` POSTs `/api/workflows/trigger` with `booking_created` but no `workflow_id`

**Verdict: CONFIRMED.**

`apps/website/features/calendar/booking.ts:235-255`:
```ts
  // Trigger CMS workflow engine (fire-and-forget)
  if (process.env.CMS_BASE_URL && process.env.WORKFLOW_TRIGGER_SECRET) {
    fetch(`${process.env.CMS_BASE_URL}/api/workflows/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKFLOW_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({
        trigger_type: 'booking_created',
        tenant_id: tenantId,
        payload: {
          appointmentId: newAppointment.id,
          responseId: data.responseId,
          surveyLinkId: data.surveyId,
          clientEmail: data.clientEmail,
          appointmentAt: data.startTime,
        },
      }),
    }).catch((err) => console.error('[Workflow] booking_created trigger failed:', err))
  }
```

**Execution timing — CORRECTION to Iter A's mental model:** This is **fire-and-forget but synchronous-on-call** (no `setTimeout`, no `await`). It runs immediately after the appointment INSERT (`booking.ts:207-221`) and BEFORE calendar event creation (`booking.ts:257-277`). The survey path uses `setTimeout(500ms)` to dodge a PgBouncer race; the booking path does not — the appointment row is inserted on the same connection and presumably the trigger payload doesn't need the row to be visible from a fresh connection (the payload carries `appointmentId` + `responseId` + `surveyLinkId` directly; downstream `get_response`/`get_survey_link` steps query different tables). This timing asymmetry is intentional but undocumented and would surprise a reader.

**Endpoint 400 verdict:** `apps/cms/app/routes/api/workflows/trigger.ts:20-33`:
```ts
const triggerEndpointSchema = z.object({
  trigger_type: z.enum([...]),
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid(),                  // ← REQUIRED, no default
  payload: z.record(z.unknown()).default({}),
})
```
Plus rejection at `:69-72`:
```ts
const parsed = triggerEndpointSchema.safeParse(rawBody)
if (!parsed.success) {
  return badRequest('invalid_payload', parsed.error.issues)
}
```
`workflow_id` is unconditionally required by Zod. Missing field → `400 invalid_payload`. Confirmed: **every booking today produces a silent 400** in CMS logs (fire-and-forget swallows the response in `booking.ts:254` `.catch(...)`).

### (b) `fetchWorkflowForPublicTriggerHandler` enforces `workflow.trigger_type === triggerType`

**Verdict: CONFIRMED. Iter A's function name is correct.**

`apps/cms/features/workflows/handlers.server.ts:419-449`:
```ts
export function fetchWorkflowForPublicTriggerHandler(
  supabase: ReturnType<typeof createServiceClient> | any,
  workflowId: string,
  triggerType: string,
): ResultAsync<{ tenantId: string }, string> {
  return ResultAsync.fromPromise(
    (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type, is_active')
      .eq('id', workflowId)
      .maybeSingle() as Promise<...>,
    (e) => (e instanceof Error ? e.message : messages.common.unknownError),
  ).andThen((res) => {
    if (res.error) return err(res.error.message)
    const workflow = res.data
    if (!workflow) return err('workflow_not_found')
    if (!workflow.is_active) return err('workflow_not_active')
    if (workflow.trigger_type !== triggerType) return err('trigger_type_mismatch')
    return ok({ tenantId: workflow.tenant_id })
  })
}
```

Service-role client (Bearer-secret auth path), three-way validation (existence + active + trigger-type match). Caller in `trigger.ts:97-101` collapses all three failure modes into a single `404 workflow_not_found_or_invalid` response — by design, to avoid leaking which check failed.

### (c) `verifyWorkflowAccess` is ownership-only, no `trigger_type` filter

**Verdict: CONFIRMED.**

`apps/cms/features/surveys/server.ts:286-302`:
```ts
function verifyWorkflowAccess(auth: AuthContext, workflowId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    return ok(undefined)
  })
}
```

The function takes ONLY `workflowId`. It checks `id` AND `tenant_id` — pure ownership scoping. There is no `trigger_type` filter, no third parameter. Called twice in `surveys/server.ts:172-173` (create) and `:218-219` (update).

**Recommended extension shape** (covered fully in Task 3.3): add an optional `expectedTriggerType` parameter, defaulting to undefined to preserve existing call sites:
```ts
function verifyWorkflowAccess(
  auth: AuthContext,
  workflowId: string,
  expectedTriggerType?: TriggerType,  // NEW — when set, filter SELECT by trigger_type
)
```
The select must additionally pull `trigger_type` (`select('id, trigger_type')`) and the `andThen` must reject when `res.data.trigger_type !== expectedTriggerType` with a distinct error key. See Task 3.3.

### (d) `TRIGGER_SUBTYPE_CONFIGS` covers all 5 trigger types incl. `booking_created`

**Verdict: CONFIRMED.**

`apps/cms/features/workflows/components/nodes/node-registry.ts:94-125`:
```ts
export const TRIGGER_SUBTYPE_CONFIGS: Record<TriggerType, NodeTypeConfig> = {
  survey_submitted: { icon: Zap, label: messages.workflows.triggerSurveySubmitted, ... },
  booking_created:  { icon: Zap, label: messages.workflows.triggerBookingCreated,  ... },
  lead_scored:      { icon: Zap, label: messages.workflows.triggerLeadScored,      ... },
  manual:           { icon: Zap, label: messages.workflows.triggerManual,          ... },
  scheduled:        { icon: Zap, label: messages.workflows.triggerScheduled,       ... },
}
```

Five entries, `booking_created` present, all share orange-500 left border.

---

## Task 2 — Booking Domain Map

### (2.1) Booking entry points — where is a booking row created?

**Single entry point.**

| # | File:line | Caller | Inserted shape | Has `survey_link_id`? |
|---|-----------|--------|----------------|----------------------|
| 1 | `apps/website/features/calendar/booking.ts:207-221` | website `createServerFn` (anon, public endpoint) | `{ response_id, user_id, tenant_id, start_time, end_time, client_name, client_email, notes, status: 'scheduled' }` | **NO** — table has no such column |

There is exactly **ONE** path that inserts into `appointments`. Other matches in the codebase are reads, deletes, or RPC updates:

- `apps/cms/features/appointments/server.ts:64,80` — `getAppointmentsFn` SELECT + `deleteAppointmentFn` DELETE. **No CMS-side INSERT exists** — admins cannot create appointments manually.
- `apps/cms/features/responses/handlers.server.ts:306,316` — SELECT (existence check) + DELETE (cascade when response deleted).
- `apps/cms/features/intake/server.ts:90,97` — SELECT for kanban view.
- `apps/cms/lib/server-fns/dashboard.ts:40` — SELECT for dashboard metrics.

**Edge case — bookings without survey_link:** Currently impossible. Every booking goes through `bookAppointment()` which **requires** `data.surveyId` (the survey_link id) at the entry point and looks up `surveyLink → surveys → tenant_id` (`booking.ts:127-146`). No admin-side appointment-creation path exists — even though the data model would allow `response_id NULL` (it's `ON DELETE SET NULL`).

**Implication for Path B:** No fallback strategy needed. Every booking, by definition, has a `survey_link_id` reachable via `response.survey_link_id`. The "what if booking has no survey_link" open question from `DECISIONS.md:127` is **moot for AAA-T-63** — though it would matter if someone later adds a CMS admin booking creator.

### (2.2) `appointments` table schema

Created in `supabase/migrations/20250105000001_initial_schema.sql:72-86`:
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  google_calendar_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Subsequent ALTERs:
- `20260305000001_rename_lawyer_id_to_user_id.sql` — `lawyer_id → user_id`
- `20260317000000_add_no_show_appointment_status.sql` — adds `'no_show'` to status check
- `20260409000000_create_calendar_connections.sql` — drops `google_calendar_event_id`, adds `calendar_event_id` + `calendar_provider` + `calendar_connection_id`

Final shape (per current migrations):
- `id`, `response_id` (nullable FK), `tenant_id` (NOT NULL), `user_id` (NOT NULL), `client_name`, `client_email`, `start_time`, `end_time` (timestamptz), `status`, `notes`, `created_at`, `updated_at`, `calendar_event_id`, `calendar_provider`, `calendar_connection_id`.

**No `survey_link_id` column.** Linkage to `survey_links` is transitive: `appointments.response_id → responses.survey_link_id`.

**`tenant_id` is direct on the table** — no need to join through anything to scope by tenant.

**`start_time` is the column matching the `{{appointmentAt}}` template variable.** Trigger payload sends `data.startTime` from the booking request (which is the same `start_time` that just got persisted).

### (2.3) Booking → workflow lookup query for the fix

For `booking.ts:236-255`, the cleanest query that fetches `survey_links.booking_workflow_id` from a booking-creation context — note that `data.surveyId` IS the `survey_link_id`, so we don't even need to traverse `appointments` or `responses`:

```ts
const { data: linkRow } = await supabase
  .from('survey_links')
  .select('booking_workflow_id')
  .eq('id', data.surveyId)
  .single()

if (linkRow?.booking_workflow_id) {
  fetch(`${process.env.CMS_BASE_URL}/api/workflows/trigger`, {
    /* ... */
    body: JSON.stringify({
      trigger_type: 'booking_created',
      workflow_id: linkRow.booking_workflow_id,   // ← THE FIX
      tenant_id: tenantId,
      payload: { /* unchanged */ },
    }),
  })
}
```

**Why no nested join:** `tenant_id` is already in scope (resolved at `booking.ts:146` from the survey-link → surveys lookup at `:127-131`). We don't need to re-fetch it. `survey_links` has anon SELECT (`USING(true)` — see `20251210151000_enable_rls_survey_links.sql`), so this query works on the website's anon client. The `.single()` is safe because the link's existence is already verified upstream at `booking.ts:127-138`.

**Optional optimization** — fold into the existing initial fetch so we skip a roundtrip:
```ts
const { data: surveyLink } = await supabase
  .from('survey_links')
  .select('booking_workflow_id, surveys(id, created_by, tenant_id)')   // ← add booking_workflow_id
  .eq('id', data.surveyId)
  .single()
```
This is the recommended shape — it costs nothing to add the column to an already-required SELECT.

### (2.4) Other booking creation paths

**None exist.**

- **CMS admin booking creation:** Searched `apps/cms/features/appointments/`, `apps/cms/features/calendar/`, `apps/cms/features/intake/` for `.insert()` on appointments. No matches. Today admins cannot create appointments manually — they can only view, update status (cancel, mark complete), and delete.
- **Google Calendar webhook ingestion:** `apps/cms/app/routes/api/calendar/` contains only `callback.ts` (OAuth code exchange — outbound sync only, not inbound webhooks). No Google Calendar event-watch webhooks exist. CMS calendar = OAuth credentials store + outbound event creation, not bidirectional sync.
- **n8n / external systems:** No n8n workflow inserts into `appointments`. The Workflow Orchestrator only writes `workflow_executions` and `workflow_step_executions`.

**Gap assessment:** Not a bug. AAA-T-63 only needs to handle the website booking path. If a future task adds an admin-side appointment creator or Google Calendar inbound sync, those paths must replicate the workflow trigger dispatch — but that's out of scope for this iteration. **Flag for `DECISIONS.md` open questions:** if/when admin booking creation is added, ensure it also fires `booking_created` (and ideally factors the trigger dispatch into a shared helper instead of duplicating the inline POST).

---

## Task 3 — UI + Validation Gaps for Path B

### (3.1) WorkflowPicker / WorkflowSelector in SurveyLinks.tsx

**CORRECTION to Iter A:** The component is **`WorkflowSelector`**, not `WorkflowPicker`. Iter A's name is wrong.

`apps/cms/features/surveys/components/SurveyLinks.tsx:64-112`:
```ts
type WorkflowSelectorOption = { id: string; name: string }

type WorkflowSelectorProps = {
  workflows: WorkflowSelectorOption[]
  value: string | null
  onChange: (workflowId: string | null) => void
  selectId: string
}

function WorkflowSelector({ workflows, value, onChange, selectId }: WorkflowSelectorProps) {
  const NONE_VALUE = '__none__'
  const selectedValue = value ?? NONE_VALUE
  return (
    <div>
      <Label htmlFor={selectId} className="text-sm">{messages.surveys.workflowSelectorLabel}</Label>
      <Select value={selectedValue} onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}>
        <SelectTrigger id={selectId} className="mt-1 text-sm">
          <SelectValue placeholder={messages.surveys.workflowSelectorPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{messages.surveys.workflowSelectorNone}</SelectItem>
          {workflows.map((wf) => (
            <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!value && (
        <div className="..." role="note" aria-live="polite">
          <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{messages.surveys.workflowSelectorHint}</span>
        </div>
      )}
    </div>
  )
}
```

**Workflows are fetched in the parent (`SurveyLinks`) via TanStack Query** (`SurveyLinks.tsx:142-146`) and passed in as a prop:
```ts
// Query for active survey_submitted workflows — used in selector dropdown
const { data: workflows = [] } = useQuery<WorkflowSelectorOption[]>({
  queryKey: queryKeys.workflows.list,
  queryFn: () => getWorkflowsForSelectorFn({ data: {} }),
})
```

**Proposed extension shape for Path B** — add `triggerType` filter to props and refetch per type:
```ts
type WorkflowSelectorProps = {
  workflows: WorkflowSelectorOption[]   // already filtered by trigger_type by parent
  triggerType: TriggerType              // NEW — for label/hint i18n + telemetry
  value: string | null
  onChange: (workflowId: string | null) => void
  selectId: string
  label?: string                        // NEW — override default label per picker instance
  hint?: string                         // NEW — override default hint
}
```

Parent must run **two** queries (one per `triggerType`) and render two pickers. Use distinct query keys: `queryKeys.workflows.byTrigger('survey_submitted')` and `queryKeys.workflows.byTrigger('booking_created')`. The current `queryKeys.workflows.list` is too coarse-grained — it would alias both lists into the same cache key.

### (3.2) `getWorkflowsForSelector` ALREADY filters by `trigger_type`

**MAJOR CORRECTION to Iter A.** Iter A claimed (in `iter-A` map §6 file table item 3 and §3 "Filter behavior") that "picker shows ALL workflows regardless of `trigger_type`". **This is wrong.** The handler accepts a `triggerType` parameter and applies it to the SELECT.

`apps/cms/features/workflows/handlers.server.ts:69-84`:
```ts
export async function getWorkflowsForSelectorHandler(
  triggerType: string = 'survey_submitted',
): Promise<WorkflowSelectorOption[]> {
  const supabase = createServerClient()
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select('id, name')
    .eq('is_active', true)
    .eq('trigger_type', triggerType)
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []) as WorkflowSelectorOption[]
}
```

`apps/cms/features/workflows/server.ts:367-372`:
```ts
export const getWorkflowsForSelectorFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { triggerType?: string }) => input)
  .handler(async ({ data }) => {
    const { getWorkflowsForSelectorHandler } = await import('./handlers.server')
    return getWorkflowsForSelectorHandler(data.triggerType)
  })
```

The current call site `getWorkflowsForSelectorFn({ data: {} })` (no `triggerType`) **defaults to `'survey_submitted'`**. So today the picker only ever shows survey_submitted workflows. **Path B requires zero changes to this server fn** — the call site simply passes `{ triggerType: 'booking_created' }` to fetch the second list.

**No client-side filtering needed.** Server-side filter is already there. Workflow count concerns are also moot (would only matter if filter was client-side). For the record: there is no per-tenant workflow count limit in any migration; production has fewer than 50 workflows total today.

### (3.3) Recommended `verifyWorkflowAccess` extension

**Recommendation: Option 1 — extend the existing helper with an optional third parameter.**

```ts
function verifyWorkflowAccess(
  auth: AuthContext,
  workflowId: string,
  expectedTriggerType?: TriggerType,
)
```

Implementation sketch:
```ts
function verifyWorkflowAccess(
  auth: AuthContext,
  workflowId: string,
  expectedTriggerType?: TriggerType,
) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('workflows')
      .select('id, trigger_type')                       // ← was 'id' only
      .eq('id', workflowId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    if (expectedTriggerType && res.data.trigger_type !== expectedTriggerType) {
      return err(messages.surveys.workflowTriggerTypeMismatch)   // ← new message key
    }
    return ok(undefined)
  })
}
```

**Why Option 1 (single helper) over Option 2 (separate `verifyWorkflowAccessForTrigger`):**
- Both call sites (create + update at `:172-173` and `:218-219`) currently call `verifyWorkflowAccess(auth, parsed.workflowId)` for the survey workflow. If we add Path B, each call site grows to TWO calls — one for survey, one for booking. Forcing each to use a different helper name doubles the helper count for no semantic gain.
- Backward compat: existing two call sites pass no third arg, behaviour unchanged. New booking branches pass `'booking_created'` explicitly.
- Project pattern: matches the established pattern of optional discriminator params (e.g. `getWorkflowsForSelectorHandler(triggerType: string = 'survey_submitted')`).

**Required follow-on edits when you adopt Option 1:**
- Add `messages.surveys.workflowTriggerTypeMismatch` to `apps/cms/lib/messages.ts` (Polish copy: e.g. *"Wybrany workflow nie pasuje do typu wyzwalacza"*).
- Update both call sites to additionally call `verifyWorkflowAccess(auth, parsed.bookingWorkflowId, 'booking_created')` when `parsed.bookingWorkflowId` is set. Chain via `.andThen` like the existing survey check.

---

## Task 4 — Edge Cases / NEW_FINDINGS

### (4.1) RLS — `survey_links` already covers new column

**Verdict: NO BLOCKER.**

The AAA-T-186 migration that added `workflow_id` documents the RLS pattern explicitly (`20260414000000_add_survey_link_workflow_id.sql:15-19`):
```sql
-- RLS: No changes needed.
-- Anon SELECT policy "Public can read survey links" uses USING(true),
-- which automatically covers the new column.
-- Authenticated policy uses tenant_id = current_user_tenant_id(),
-- which also covers the new column without modification.
```

Adding `booking_workflow_id` is structurally identical — `USING(true)` and `tenant_id = current_user_tenant_id()` policies cover any new column added to `survey_links`. **Authenticated users can update `booking_workflow_id` via the existing tenant-isolation policy** (UPDATE policy uses the same `current_user_tenant_id()` predicate as SELECT).

### (4.2) Test infrastructure — surveys feature has NO tests

**NEW_FINDING — severity LOW (informational).**

- `apps/cms/features/surveys/__tests__/` does not exist — no surveys server fn tests.
- `apps/website/features/calendar/__tests__/booking.test.ts` exists with one relevant test at `:438-462` that asserts the `booking_created` trigger POST is fired but does NOT assert `workflow_id` (matches Iter A's claim that line 452 only asserts the URL, not the body's `workflow_id`).

```ts
it('fires booking_created workflow trigger after successful appointment', async () => {
  // ... mocks ...
  await bookAppointment(mockSupabase as any, validBookingRequest())
  await vi.waitFor(() => { expect(mockFetch).toHaveBeenCalledTimes(1) })
  const [url, options] = mockFetch.mock.calls[0]
  expect(url).toBe('https://cms.test.com/api/workflows/trigger')
  // ... asserts trigger_type, tenant_id, payload.appointmentId/responseId/clientEmail ...
  // NO assertion on body.workflow_id
})
```

**Implication:** This existing test will start to fail when `booking.ts` adds the `survey_links.booking_workflow_id` lookup (the mock chain doesn't include the new SELECT). It's a guaranteed test refactor — not a blocker, just a known scope item:
- Add a mock for the `from('survey_links').select('booking_workflow_id...').eq('id', ...).single()` call.
- Add 2 new test cases per `DECISIONS.md` migration step #6: null `booking_workflow_id` → no dispatch; populated `booking_workflow_id` → workflow_id forwarded in body.

**Surveys feature gap:** No existing tests means there's no test scaffolding to mirror for the server-side validation changes (Path B's `bookingWorkflowId` validation in create/update). This is also LOW severity — the workflow create/update server fns at `apps/cms/features/workflows/__tests__/actions.test.ts` and `apps/cms/features/workflows/__tests__/server-queries.test.ts` provide mockable patterns to copy.

### (4.3) Type regen — documented and reliable

**Verdict: NO BLOCKER.**

`package.json:22`:
```json
"db:types": "supabase gen types typescript --local > packages/database/src/types.ts"
```

Documented in `supabase/CLAUDE.md` (loaded into context) — known gotcha: the command can prepend `"Initialising login role..."` text to the file. The CLAUDE.md notes the workaround (`grep -v "^Initialising"`) but the current `package.json` script does NOT include it. Worth flagging as a separate cleanup if someone trips on it during this task — not a blocker for the migration itself.

### (4.4) Fire-and-forget timing — mock chain refactor required

**NEW_FINDING — severity LOW.**

Current booking.ts dispatch (`booking.ts:236-255`) runs **without await and without setTimeout**, immediately after the appointment INSERT returns. The fix shape adds an extra `select('booking_workflow_id')` query on `survey_links` BEFORE the dispatch decision.

Two implementation paths:
1. **Folded into the initial survey-link fetch** at `:127-131` — recommended. Adds the column to the existing `.select('surveys(...)')` call. Zero added roundtrips.
2. **Separate query before dispatch** at `:235` — clearer but adds one roundtrip.

If path 1: the initial-fetch mock at `booking.test.ts:127-138` (and analogous test mocks) must be extended to return `booking_workflow_id`. If path 2: a new mock chain must be added. **Path 1 is cleaner** and matches the existing survey-submit pattern (`apps/website/features/survey/server.ts:128-141` reads `survey_links.workflow_id` plus tenant in a single SELECT).

### (4.5) `surveys.notFound` error message reused for "workflow access denied"

**NEW_FINDING — severity MEDIUM (pre-existing, not blocking AAA-T-63 but worth flagging).**

`verifyWorkflowAccess` returns `messages.surveys.notFound` on either (a) missing workflow row or (b) cross-tenant workflow id (the `tenant_id` mismatch returns `null` from `.maybeSingle()`, which hits the same `if (!res.data)` branch). The user-facing copy thus says "survey not found" when the actual cause is "you tried to attach a workflow you don't own". Confusing in dev console, harmless to end users (they can't trigger this without forging a workflow ID).

For Path B with the `expectedTriggerType` extension, the `trigger_type !== expectedTriggerType` branch also needs a distinct message key (proposed: `messages.surveys.workflowTriggerTypeMismatch`). This is the natural moment to also split out a separate `messages.surveys.workflowAccessDenied` for the existing missing-row case. **Not a blocker** — I'd defer the split unless the work is happening anyway.

### (4.6) `data.surveyId` is the survey_link.id — confirmed not the token

The booking request type (`BookingRequest`) field `surveyId` is the **survey_link UUID**, not the public token. Verified at `booking.ts:127-131` (`survey_links` queried by `id`, not `token`) and at `:152-153` (responses joined by `survey_link_id`). The `validateSurveyLinkIdInPayload` defense-in-depth in `trigger-payload-validators.ts` rejects tokens. Important guardrail — the booking workflow_id lookup uses the same id, no conversion needed.

---

## Migration Path Verdict

**No blockers. The migration path drafted in `DECISIONS.md:131-161` is sound, with two specifications that should be tightened:**

1. **Step 5 (booking.ts fix):** Use the **folded-fetch** shape — add `booking_workflow_id` to the existing `survey_links` SELECT at `booking.ts:127-131`. Avoids a second roundtrip and a separate test-mock chain. The plan currently draft says "read `survey_links!inner(booking_workflow_id, surveys!inner(tenant_id))` for the booking's `survey_link_id`" — clarify that the lookup uses `data.surveyId` directly (which IS the survey_link.id), not the booking's `response_id` or anything more indirect.

2. **Step 7 (workflows query enhancement):** **DELETE this step.** `getWorkflowsForSelectorHandler` already accepts the `triggerType` filter and applies it server-side. The plan's "decide based on workflow count, client-side fine" trade-off is moot — no decision needed, no new function needed.

Update `DECISIONS.md:121-128` open questions:
- Q: tenant context in booking.ts → A: already in scope (`tenantId` resolved at `booking.ts:146`).
- Q: shape of join → A: `data.surveyId` IS the survey_link.id; just add the column to the existing initial SELECT.
- Q: bookings without survey_link → A: impossible today (single entry point requires it). Flag for future admin-booking-creator task.
- Q: booking_created payload always has surveyLinkId → A: yes, it's `data.surveyId` which is required by the booking API.
