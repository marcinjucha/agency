# Workflow Engine Roadmap (2026-04-10)

Zaplanowane w sesji /ag-notion-work. Kolejność implementacji: T-177 → T-178+T-179 → T-180 → T-181.

---

## AAA-T-177 — Workflow Builder UX Overhaul [XL, High, P-4]

Trzy pod-obszary (kolejność impl: b → a → c):

### (b) Input/Output Dynamic Data Flow
- Dynamic output schema per step type (AI zwraca custom fields z prompta)
- Variable context per step = trigger vars + output z poprzednich kroków
- Traversal grafu wstecz od aktualnego stepu → zebranie dostępnych zmiennych
- Variable inserter grouped by source (Trigger / Step 1 / Step 2...)
- **Implementować razem z T-179 (AI prompt)** — ten sam problem: step deklaruje co zwraca

### (a) Drag & Drop + Step Library
- Panel boczny z biblioteką kroków (jak n8n)
- Kategorie: Actions (send_email, webhook), Logic (condition, delay), AI (ai_action)
- ReactFlow `onDrop` + `onDragOver` na canvas
- Każdy step type ma ikonę, opis, kategorię
- Zastępuje przycisk "dodaj krok"

### (c) Test Mode z edytowalnym mock data
- Source: z logów (replay execution) lub mock data (ręcznie wpisane)
- Edytowalny mock data + re-run wielokrotnie do tuningu
- Dry-run step by step, pokazuje co każdy step dostał i co zwrócił
- Canvas visualization: green = passed, red = failed, gray = skipped

---

## AAA-T-178 — Migracja direct n8n webhooks na workflow engine [M, High, P-4]

Połączone: survey submission + manual AI re-analysis (oba usuwają direct webhooks).

### Scope
- **Survey submission** (`apps/website/features/survey/submit.ts:64-79`): zamienić 2 direct n8n webhooks na 1 `survey_submitted` trigger → `/api/workflows/trigger`
- **Manual AI re-analysis** (`apps/cms/features/responses/actions.ts:50`): zamienić direct webhook na `manual` trigger
- Usunąć env vars: `N8N_WEBHOOK_SURVEY_ANALYSIS_URL`, `N8N_WEBHOOK_FORM_CONFIRM_EMAIL_URL`
- Default workflow template: `survey_submitted` → `ai_action` → `lead_scored` trigger → `send_email`
- Backward compat: stary webhook równolegle do czasu potwierdzenia workflow

### Po migracji
Jedyne env vars do n8n: `N8N_WORKFLOW_EXECUTOR_URL` + `N8N_MARKETPLACE_WEBHOOK_URL`

---

## AAA-T-179 — AI prompt edytowalny per workflow [S, High, P-4]

### Scope
- Pole `prompt` w `ai_action` step config schema
- Config panel w workflow builder z textarea na prompt
- n8n Workflow Action Executor przekazuje `config.prompt` do MiniMax Agent
- Default prompt w template (aktualny hardcoded z n8n)
- Dynamic output schema — AI response fields zależne od prompta

**Implementować razem z T-177 (b)** — output schema to fundament data flow.

---

## AAA-T-180 — Booking accept/reject flow + emaile [L, Medium, P-4]

### Scope
- CMS accept/reject UI w Intake Hub (lub appointments view)
- Server actions: `acceptAppointment`, `rejectAppointment` (z powodem reject)
- 3 nowe trigger types + variable schemas w `trigger-schemas.ts`:
  - `booking_created` → email do firmy (powiadomienie o nowym bookingu)
  - `booking_accepted` → email do klienta (potwierdzenie, vars: clientName, bookingDate, bookingTime, companyName)
  - `booking_rejected` → email do klienta (informacja, vars: clientName, bookingDate, bookingTime, rejectionReason, companyName)
- 3 email templates
- Default workflow templates dla każdego triggera

### Kontekst
Trigger pipeline już działa (`booking_created` wdrożony w AAA-T-152). Nowe triggery to ten sam mechanizm.
Aktualnie użytkownik może zabukować wizytę, ale firma musi ją potwierdzić lub odrzucić — brakuje UI + email flow.

---

## AAA-T-181 — Marketplace notifications przez workflow engine [M, Low, P-9]

### Scope
- Nowe trigger types: `marketplace_published`, `marketplace_error`, `marketplace_imported`
- n8n marketplace workflows triggerują workflow engine po zakończeniu
- Trigger variable schemas (productName, marketplace, status, errorMessage)
- Email templates z info o statusie
- Default workflow templates

### Zależność
Zależy od stabilnej migracji trigger pipeline (T-178).

---

## Cleanup wykonany w Notion (2026-04-10)

- AAA-T-103 → Cancelled (Google Calendar token refresh — Baikal zastąpił)
- AAA-T-158 → On Hold (workflow backlog placeholder)
- AAA-T-176 → przeniesiony z P-8 do P-4
- 5 projektów → dodane prefiksy [AAA-P-X]
- AAA-P-10 → priorytet Medium
- AAA-T-155 → To Do / Medium, AAA-T-156 → To Do / Medium
- AAA-T-161 → To Do / High, AAA-T-169 → To Do / Low
