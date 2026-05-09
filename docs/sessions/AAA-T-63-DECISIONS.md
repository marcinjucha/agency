# AAA-T-63 — Architectural Decisions Log

> Trwały log decyzji architektonicznych dla booking-triggered workflows.
> Aktualizowany po każdej iteracji analizy i po kluczowych decyzjach implementacyjnych.
> Przeznaczenie: weryfikacja przez usera, retrospekcja, bridge dla follow-up tasków.

---

## Context

**Problem:** Aktualnie po booking-u (rezerwacja kalendarzowa) akcje (emaile, zapisy, notyfikacje) wykonywane są ręcznie. Survey ma już automatyzację przez workflow engine — booking nie. Cel: dodać booking-triggered workflows analogicznie.

**Reference pattern:** Survey trigger pipeline (`survey.submitted` event → trigger handler n8n → workflow execution → step handlery). Zostanie zmapowany w Iter A.

**Anchor task:** AAA-T-63 (booking_confirmation email — dwa emaile po rezerwacji). To pierwszy konkretny workflow który ma działać na nowej architekturze.

**End-state user-facing (sprecyzowane przez usera 2026-05-09):**
> "Mogę wejść i stworzyć sobie workflow, dodać go do ankiety, a po wypełnieniu ankiety i dodaniu spotkania, workflow zostanie wywołane."

Tłumaczenie na model:
1. **Workflow należy do ankiety**, nie istnieje samodzielnie z punktu widzenia attachment-u (workflow jako entity może istnieć osobno, ale jego trigger jest powiązany z konkretną ankietą).
2. **Trigger compound**: `survey filled AND booking added`. Workflow uruchamia się gdy klient wypełnił ankietę I zarezerwował slot kalendarzowy. Pojedyncze survey-only submission bez bookingu → ten konkretny workflow NIE odpala (oddzielne workflowy mogą reagować na samo `survey.submitted`).
3. **Constraint na step types — NIE rozszerzamy alfabetu.** Każdy nowy `step_type` w schemacie = nowy handler subworkflow w n8n którego user musi dodać ręcznie. Pozostajemy przy: `trigger`, `send_email`, `condition`, `delay`, `webhook`, `ai_action`.

---

## Iteration Log

### Iter A — Map Survey Trigger Pipeline (reference) — DONE 2026-05-09

Agent: ag-analyst-agent (a3f15e98e1f7e4c98). Output: `docs/sessions/AAA-T-63-iter-A-survey-pipeline-map.md`. Tool uses: 40, duration: 4.5min.

**Key findings (load-bearing):**
1. `booking_created` is registered in **10 files** (not 4 from memory.md). Engine-level support COMPLETE: trigger validation, n8n Orchestrator universal pass-through, payload schema, all step types Switch case in Process Step. The only missing piece is the **attachment in survey_links** (no column binds workflow→booking event for a given link).
2. `apps/website/features/calendar/booking.ts:236-255` already POSTs `/api/workflows/trigger` with `trigger_type: 'booking_created'` AND a rich payload (`appointmentId`, `responseId`, `surveyLinkId`, `clientEmail`, `appointmentAt`) BUT **omits `workflow_id`** — endpoint Zod-rejects with 400. Today every booking produces a silent 400 in logs (fire-and-forget = no test/UI failure surfaces).
3. **Step types are sufficient** for booking_confirmation use case. `get_response` (reads `responses` by `responseId` from payload) and `get_survey_link` (reads `survey_links` by `surveyLinkId` from payload) work as-is for booking workflows because the booking trigger payload carries both IDs. NO new `get_appointment` step type needed UNLESS workflow must read appointment-only fields (notes, start_time, calendar provider) — out of scope for AAA-T-63.
4. Trigger Handler subworkflow in n8n is a **no-op pass-through** — trigger payload becomes `variableContext` directly. Template expressions like `{{responseId}}`, `{{surveyLinkId}}`, `{{appointmentId}}`, `{{clientEmail}}`, `{{appointmentAt}}`, `{{clientName}}`, `{{notes}}`, `{{companyName}}` are all available in any step's config without hydration code.
5. `survey_links.workflow_id UUID NULL FK→workflows(id)` is the existing attachment column (migration `20260414000000`). Picker UI lives in `apps/cms/features/surveys/components/SurveyLinks.tsx` (`WorkflowPicker` component, used in create+edit forms). Filter behavior: shows ALL workflows regardless of `trigger_type` — needs filter for Path B.

**Agent recommended Path A (single column, trigger_type discriminates).** REJECTED — see D-001.

### Iter B — Booking Domain Map + Verification — DONE 2026-05-09

Agent: ag-analyst-agent (a4838b5a238c95e16). Output: `docs/sessions/AAA-T-63-iter-B-booking-domain-map.md`. Tool uses: 36, duration: 6min.

**Verifications (CONFIRMED unless noted):**
- (a) booking.ts:236-255 omits workflow_id → 400: CONFIRMED. Timing CORRECTION: fire-and-forget but synchronous-on-call (no setTimeout, vs survey path which has 500ms setTimeout for PgBouncer race protection). Documented but not a blocker.
- (b) `fetchWorkflowForPublicTriggerHandler` enforces trigger_type match: CONFIRMED.
- (c) `verifyWorkflowAccess(auth, workflowId)` is ownership-only, no trigger_type filter: CONFIRMED. Recommended extension: optional `expectedTriggerType?: TriggerType` 3rd param.
- (d) `TRIGGER_SUBTYPE_CONFIGS` covers 5 trigger types: CONFIRMED.

**MAJOR CORRECTIONS to Iter A:**
1. Component name is **`WorkflowSelector`**, NOT `WorkflowPicker`. Critical for agent implementing UI step.
2. `getWorkflowsForSelectorHandler` **ALREADY filters by `trigger_type`** server-side (default `'survey_submitted'`). Iter A claimed picker shows all workflows — wrong. Path B requires ZERO changes to this server fn — caller passes `{ triggerType: 'booking_created' }`. **Step 7 deleted from migration path.**

**Booking domain findings:**
- Single booking entry point: `apps/website/features/calendar/booking.ts:207-221` (anon createServerFn, public). No CMS admin booking creator, no Google Calendar inbound webhooks. Path B has no dead branches.
- Table is **`appointments`** (NOT `bookings`). No `survey_link_id` column — linkage transitive via `response_id → responses.survey_link_id`. `tenant_id` is direct on appointments. `start_time` is the column matching `{{appointmentAt}}` template variable.
- `data.surveyId` from BookingRequest IS the `survey_link.id` (UUID, not the public token). Confirmed by `booking.ts:127-131`.
- `tenant_id` is already in scope at `booking.ts:146` — no extra fetch needed for the workflow lookup.

**New findings (not blockers):**
- (4.2) LOW: surveys feature has NO `__tests__/` directory. Mirror patterns from `apps/cms/features/workflows/__tests__/`.
- (4.4) LOW: existing `booking.test.ts:438-462` only asserts trigger fires, doesn't assert `workflow_id` in body. Mock chain needs extension when fix lands.
- (4.5) MEDIUM (pre-existing, defer): `verifyWorkflowAccess` returns `messages.surveys.notFound` on cross-tenant workflow id (rather than dedicated "access denied" message). User-facing copy says "survey not found" when actual cause is workflow ownership. Not blocking AAA-T-63.
- (4.3) TYPE REGEN gotcha: `pnpm db:types` can prepend `"Initialising login role..."` to types.ts. Mitigation in supabase/CLAUDE.md (`grep -v "^Initialising"`). Not in package.json script — flag as cleanup if hit.

### Iter C — SKIPPED

Synthesis done inline below. Iter B left no blockers and refined migration path is concrete enough to execute.

---

## Decisions

_(każda decyzja: WHAT / WHY / TRADEOFFS / ALTERNATIVES_REJECTED)_

### D-001: Path B — dual workflow attachment per survey_link (separate columns)

**WHAT:** Add `survey_links.booking_workflow_id UUID NULL FK→workflows(id)` as a SECOND column alongside existing `survey_links.workflow_id`. Existing column stays semantically tied to `survey_submitted`; new column ties to `booking_created`. SurveyLinks UI gains a SECOND `WorkflowPicker` (one per trigger event).

**WHY:**
- User explicitly stated: "Chcę mieć dwa oddzielne workflow dla tego, co się dzieje, jak ankieta jest dodana, i jak booking jest zrobiony" — two distinct workflows per link.
- Path A (single column, workflow.trigger_type discriminates) would force the user to choose between survey-event or booking-event behaviour for a given link, but never both. Doesn't match the UX requirement.
- Two columns is 1 migration + 1 picker addition. Zero new domain concepts. The data model parallels how the survey workflow attachment already works.

**TRADEOFFS:**
- + Each link can independently fire workflow A on survey-submit AND workflow B on booking-created (or null on either side).
- + Picker UI per event is more discoverable than a "trigger_type filter" hidden inside one picker.
- − Doubles the column count. Marginal cost.
- − Requires picker filter by `trigger_type` (each picker shows only workflows of its own type). New small validation rule in server.ts.
- − Future trigger types (`lead_scored`, `scheduled`) might want their own columns — solvable later via either more columns or a junction table. Don't prematurely abstract now.

**ALTERNATIVES REJECTED:**
- **Path A (one workflow per link, trigger_type discriminates):** rejected — doesn't satisfy "two separate workflows per link".
- **Junction table `survey_link_workflows(survey_link_id, workflow_id, trigger_type)`:** rejected for AAA-T-63 — over-engineered for 2 trigger types when current scale is "5 trigger types EVER planned". Reconsider only if 4+ trigger types per link become real.
- **Rename existing `workflow_id` → `survey_workflow_id` for symmetry:** REJECTED — breaks all existing reads in website + n8n + tests + migrations. Cost > clarity gain. Document with a comment instead.

### D-002 (REVISED 2026-05-09): Slim trigger payload to IDs + add `get_appointment` step type

**Original framing was wrong.** I claimed step types were "sufficient" because the rich `booking_created` payload carried client/appointment fields — but that argument actually exposed a **violation** of the project's foundational principle, articulated by the user mid-session:

> "W triggerze teoretycznie powinny być same ID, które potem użyję, żeby pobrać jakieś dane i coś z nimi zrobić dalej."
> ("Trigger should theoretically carry only IDs which I then use to fetch data and do something with it downstream.")

**Foundational principle: ID-only triggers, explicit hydration via steps.**

Why this principle (architectural value):
1. **Visual clarity on canvas.** A workflow renders as "Pobierz spotkanie → Pobierz odpowiedź → Wyślij email" — the graph is self-documenting. Rich-payload approach hides hydration: "Wyślij email" with magical `{{appointmentAt}}` from nowhere.
2. **Per-step audit + retry.** Each `get_*` step gets its own `workflow_step_executions` row. Failure (e.g., row deleted between trigger and step execution) surfaces at a specific step → can retry just that step. Rich payload defers the failure into whatever step first dereferences a stale field.
3. **Decoupling trigger emitter from workflow content.** `booking.ts` (trigger source) only knows IDs — it doesn't need to know what fields downstream workflows might want. New fields on `appointments` don't require trigger-payload schema migrations.

**WHAT (revised):**
1. **Slim `booking_created` payload** in `apps/website/features/calendar/booking.ts` and `apps/cms/lib/trigger-schemas.ts` to ONLY: `appointmentId`, `responseId`, `surveyLinkId`. Drop `clientEmail`, `appointmentAt`, `notes`, `clientName`, `companyName` from payload. Same shape principle for other trigger types over time (out of scope for this branch).
2. **Add `get_appointment` step type** to give workflows access to appointment-specific fields (`start_time`, `end_time`, `notes`, `calendar_provider`, `status`). Mirrors `get_response` shape — config takes `appointmentIdExpression` (default `{{appointmentId}}`), handler subworkflow does Supabase REST query, output exposes appointment fields as variables to downstream steps.

**Concrete impact for `booking_confirmation` workflow user wants to build:**
- Use `get_response` to read `respondent_name`, `client_email`, `survey_title` from response.
- Use `get_appointment` to read `start_time`, `notes`.
- Then `send_email` step with template `Cześć {{respondentName}}, potwierdzamy {{startTime}}...`.

**WHY revisited:**
- User explicitly said "nie był constraint, tylko wskazówka" — adding step types is fine if they earn their place. `get_appointment` earns it because: (a) every booking workflow that needs appointment fields will need it, (b) the principle makes ID-only triggers cleaner.
- Cost is concentrated: registry entry + Zod schema + config panel + n8n handler subworkflow stub + Switch case in Process Step. The user will fill in the n8n handler logic since they own n8n side.

**TRADEOFFS:**
- + Architecturally consistent — booking pipeline mirrors survey pipeline (where `get_response` + `get_survey_link` already implement the principle).
- + Workflow canvas readable.
- + Future trigger types follow the same pattern, no temptation to overload payloads.
- − Smoke test gated on user's n8n handler work (cannot test booking_confirmation end-to-end until `get_appointment` handler is wired in n8n).
- − Existing `lib/trigger-schemas.ts` `booking_created` variables (5 fields) are **breaking change** — if any other workflow already used them as `{{clientEmail}}` etc., it breaks. Mitigation: production has zero booking workflows attached today (column added in this branch), so the breaking change has no live consumers.

**ALTERNATIVES REJECTED:**
- **Generic `fetch_record` step with `resource_type` param** — would require refactoring 3 existing handlers into a parameterized form. Off-scope.
- **Keep rich payload as compatibility layer** — would freeze the principle violation. The breaking-change window is now (zero live booking workflows) and we burn it.

**REPLACES original D-002 deferred-`get_appointment` framing.** Implemented in Commits 7-8.

### D-003: Defer trigger-type-registry refactor (10-files duplication)

**WHAT:** The `TriggerType` string union duplicated across 10 files (catalogued in Iter A §7) is genuine tech debt but stays unaddressed in AAA-T-63. Adding `booking_created` does NOT touch any of these 10 files (already registered everywhere).

**WHY:**
- AAA-T-63 doesn't add a new trigger type — it activates an existing one.
- Refactoring to a unified `TRIGGER_REGISTRY` (mirror of `STEP_REGISTRY`) is L-sized work spanning 10 files + Zod enum derivation + discriminated union codegen. Off-scope for AAA-T-63.
- Document the debt in DECISIONS.md (this entry) so future trigger-type additions land on a clean refactor, not on top of more debt.

**FOLLOW-UP TASK** (not AAA-T-63): create Notion/ClickUp task "TRIGGER_REGISTRY refactor — unify 10-file duplication". Triggered when adding the 6th trigger type or when 4+ duplications drift out of sync.

### D-004: Fix the booking trigger 400-bug as part of the same change

**WHAT:** The `booking.ts:236-255` POST currently 400s because it omits `workflow_id`. The same edit that adds Path B attachment naturally fixes this — read `survey_links.booking_workflow_id`, skip dispatch if null, otherwise include in body. Zero extra effort.

**WHY:** Pre-existing silent bug (fire-and-forget hides 400s). Skipping dispatch when null is cleaner than mutating the endpoint to accept missing workflow_id (would break the contract for the survey path that still requires it).

**TRADEOFFS:** None — the fix is a side-effect of the attachment work.

### D-005: Folded-fetch — add `booking_workflow_id` to existing SurveyLink SELECT

**WHAT:** Instead of adding a separate query before the trigger dispatch in `booking.ts`, add the `booking_workflow_id` column to the EXISTING `survey_links` SELECT at `booking.ts:127-131` that already fetches survey + tenant context.

**WHY:**
- Zero new roundtrips (already querying that row).
- Single mock-chain extension in `booking.test.ts` instead of two.
- Matches pattern in `apps/website/features/survey/server.ts:128-141` where survey_submitted's `workflow_id` is also fetched as part of the upstream SELECT.

**TRADEOFFS:** None.

### D-006: Component already fetches workflow list per `triggerType` server-side — no new query needed

**WHAT:** `getWorkflowsForSelectorHandler` accepts `triggerType: string = 'survey_submitted'` parameter and applies it as `.eq('trigger_type', triggerType)` filter on the SELECT. For Path B, the parent `SurveyLinks` component runs TWO TanStack Query calls — one with `{ triggerType: 'survey_submitted' }`, one with `{ triggerType: 'booking_created' }` — and renders two `WorkflowSelector` instances.

**WHY:**
- Server fn already exists with the right shape — discovered in Iter B (Iter A misread this).
- Distinct query keys (`queryKeys.workflows.byTrigger('survey_submitted')` vs `byTrigger('booking_created')`) prevent cache aliasing. May need to add `byTrigger` factory to `queryKeys`.
- No `listWorkflows` enhancement required — original migration path Step 7 deleted.

**TRADEOFFS:** None.

### D-007: Defer `surveys.notFound` → `workflowAccessDenied` message split

**WHAT:** The pre-existing pattern where `verifyWorkflowAccess` returns `messages.surveys.notFound` for both "workflow doesn't exist" and "workflow exists but wrong tenant" is confusing in dev console but harmless to end users. Don't split as part of AAA-T-63 — defer.

**WHY:** Out of scope for booking-trigger feature. Adds risk for no AAA-T-63 user-facing benefit. Flag as separate cleanup task if/when surveys-feature messaging is being audited.

**TRADEOFFS:** None — it's a deferral, not a decision.

---

## Open Questions

_(do verification w Iter B)_

- Czy w `booking.ts` jest tenant context łatwo dostępny do query `survey_links.booking_workflow_id` (analogiczny do `submitResponseFn` patternu)? Iter B sprawdzi ścieżkę odczytu.
- Jaki jest dokładny shape wpisu w `survey_links` — czy istnieje join z `surveys` tablą żeby wziąć `tenant_id`? (Iter A pokazał survey_submitted reads `survey_links!inner(surveys!inner(tenant_id))` ale dla bookingu może być inaczej zorganizowane.)
- Czy są ścieżki tworzenia bookingu BEZ survey_link (np. admin tworzy booking ręcznie w CMS)? Jeśli tak, to ten path nie ma `survey_link.booking_workflow_id` do odczytu — fallback strategy?
- Czy `booking_created` payload zawsze ma `surveyLinkId`, czy może być null (booking z innej ścieżki)? Schema check w Iter B.

---

## Migration Path — FINAL (post Iter B)

Step 7 deleted (`getWorkflowsForSelectorHandler` already filters server-side). Step 5 refined to folded-fetch (D-005). Logical commit groups marked.

### Commit 1 — Database layer (foundation)
1. **Migration** `supabase/migrations/<timestamp>_add_survey_link_booking_workflow_id.sql`:
   - `ALTER TABLE survey_links ADD COLUMN booking_workflow_id UUID NULL REFERENCES workflows(id) ON DELETE SET NULL;`
   - Partial index `idx_survey_links_booking_workflow_id ON survey_links(booking_workflow_id) WHERE booking_workflow_id IS NOT NULL`
   - `COMMENT ON COLUMN survey_links.booking_workflow_id IS 'Workflow that fires on booking_created event for this link. trigger_type filter enforced in app layer (verifyWorkflowAccess).'`
   - RLS comment block (mirror `20260414000000_add_survey_link_workflow_id.sql:15-19`): no policy changes needed — anon `USING(true)` and authenticated `tenant_id = current_user_tenant_id()` cover any new column.
2. **Type regen** — `pnpm db:types`. If "Initialising login role..." prepended, strip with `grep -v "^Initialising"`.

### Commit 2 — CMS server layer (validation + access check)
3. **Validation** (`apps/cms/features/surveys/validation.ts:35,55`):
   - Add `bookingWorkflowId: z.string().uuid().nullable().optional()` to both `createSurveyLinkSchema` and `updateSurveyLinkSchema`.
4. **`verifyWorkflowAccess` extension** (`apps/cms/features/surveys/server.ts:286-297`):
   - Add optional 3rd param `expectedTriggerType?: TriggerType`.
   - Extend SELECT from `'id'` to `'id, trigger_type'`.
   - Add branch in `andThen`: if `expectedTriggerType && res.data.trigger_type !== expectedTriggerType` → return `err(messages.surveys.workflowTriggerTypeMismatch)`.
5. **New message key** (`apps/cms/lib/messages.ts`):
   - `surveys.workflowTriggerTypeMismatch: 'Wybrany workflow nie pasuje do typu wyzwalacza'`
6. **Server fn create + update** (`apps/cms/features/surveys/server.ts:151-185, :202-235`):
   - Accept `bookingWorkflowId` from validated input.
   - When set, chain `verifyWorkflowAccess(auth, bookingWorkflowId, 'booking_created')` after the existing `verifyWorkflowAccess(auth, workflowId)` call (or in parallel if Result composition allows).
   - Persist `booking_workflow_id` in the insert/update.

### Commit 3 — CMS UI layer (dual picker)
7. **WorkflowSelector + queryKeys** (`apps/cms/features/surveys/components/SurveyLinks.tsx`):
   - Add `triggerType: TriggerType` prop to `WorkflowSelector` (used for label/hint i18n only — workflows are pre-filtered by parent).
   - Optional: add `label`/`hint` overridable props if i18n keys differ per trigger.
   - In parent `SurveyLinks`, replace single TanStack Query with TWO:
     ```ts
     const { data: surveyWorkflows } = useQuery({ queryKey: queryKeys.workflows.byTrigger('survey_submitted'), queryFn: () => getWorkflowsForSelectorFn({ data: { triggerType: 'survey_submitted' } }) })
     const { data: bookingWorkflows } = useQuery({ queryKey: queryKeys.workflows.byTrigger('booking_created'), queryFn: () => getWorkflowsForSelectorFn({ data: { triggerType: 'booking_created' } }) })
     ```
   - Add `byTrigger` factory to `queryKeys.workflows` (likely in `apps/cms/lib/query-keys.ts` or feature-local).
   - Render TWO `WorkflowSelector` instances in both create AND edit forms — one per trigger type — with separate state slots and distinct `selectId`s.
   - `WorkflowDisplay` extended (or duplicated) to show both bindings on the link row when present.
8. **Form schema in component** (likely `useState` or RHF):
   - Add `bookingWorkflowId` state alongside existing `workflowId`. Wire to second selector's `value`/`onChange`.

### Commit 4 — Website booking trigger fix
9. **Folded-fetch** (`apps/website/features/calendar/booking.ts:127-131`):
   - Add `booking_workflow_id` to the existing `survey_links!inner(...)` SELECT.
10. **Dispatch fix** (`apps/website/features/calendar/booking.ts:235-255`):
    - Read `surveyLink.booking_workflow_id` (now in scope from step 9).
    - Wrap the `fetch()` block in `if (surveyLink.booking_workflow_id) { ... }` → skip dispatch if null.
    - Add `workflow_id: surveyLink.booking_workflow_id` to the POST body.

### Commit 5 — Tests
11. **Booking trigger test extension** (`apps/website/features/calendar/__tests__/booking.test.ts:438-462`):
    - Extend the survey_links mock chain to include `booking_workflow_id` in returned shape.
    - Update existing assertion to also check `body.workflow_id === <mocked-uuid>`.
    - Add 2 new test cases:
      a. `null booking_workflow_id` → no fetch dispatched (assert `mockFetch` not called).
      b. populated `booking_workflow_id` → fetch fires with `body.workflow_id` matching.
12. **Surveys server test** (NEW file `apps/cms/features/surveys/__tests__/server.test.ts`):
    - Mirror patterns from `apps/cms/features/workflows/__tests__/actions.test.ts`.
    - Cases: createSurveyLink with valid `bookingWorkflowId` (booking_created) succeeds; with mismatched trigger_type fails with `workflowTriggerTypeMismatch`; updateSurveyLink null clears the column.

### Commit 6 — Docs + memory
13. **PROJECT_SPEC.yaml update** — set `Workflows engine` feature description to mention dual workflow attachment.
14. **memory.md** — capture learnings: 10-files trigger duplication tally, folded-fetch pattern reuse from survey_submitted, `WorkflowSelector` component name (so future agents don't search for "WorkflowPicker").
15. **Change Log entry** in ClickUp (or Notion mirror until migration decided).

### Manual smoke test (Phase 4)
- Create workflow with `trigger_type: 'booking_created'` containing `trigger → send_email` (template referencing `{{clientEmail}}`, `{{appointmentAt}}`, `{{notes}}`).
- Attach to a survey_link via the new "Workflow on booking" picker.
- Submit a survey response, then book a calendar slot.
- Verify: email arrives at `{{clientEmail}}`, `workflow_executions` row created, `workflow_step_executions` row for send_email step is `succeeded`.
