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

---

## AAA-T-177 — Status implementacji (2026-04-10)

Branch: `feature/aaa-t-177-workflow-builder-ux-overhaul`
Migracja: `supabase/migrations/20260410120000_add_dry_run_flag.sql` — uruchom przed testami.

### Co zostało zaimplementowane

**(b) Input/Output Dynamic Data Flow**
- `STEP_OUTPUT_SCHEMAS` — każdy typ kroku deklaruje co zwraca
- `collectAvailableVariables()` — przechodzi wstecz po grafie (BFS), zwraca zmienne pogrupowane po źródle
- Variable inserter w panelach konfiguracyjnych pokazuje: Trigger / Krok 1: Wyślij email / Krok 2: AI...
- `StepConfigAiAction.output_schema` — per-instancja pola wyjściowe dla AI

**(T-179) AI prompt per workflow**
- Pole `prompt` w panelu Akcja AI z variable inserterem
- Edytor pól wyjściowych (+ Dodaj pole / usuwanie)
- Domyślne pola pokazane jako podpowiedź gdy brak customowych

**(a) Drag & Drop + Step Library**
- Panel boczny Biblioteka (240px) z 3 kategoriami: Akcje / Logika / AI
- Przeciągnij krok na canvas → tworzy węzeł w miejscu upuszczenia
- Prawy klik na krok → kontekstowe menu z "Usuń krok" (trigger chroniony)

**(c) Test Mode**
- Przycisk "Test" (kolba) otwiera TestModePanel
- Edytowalny JSON z danymi triggera (pre-populated ze schematu)
- Dry-run: bez side effects (brak emaili, n8n, webhooków), wyniki w canvas (zielony/czerwony/szary)
- "Z wykonania" tab: załaduj trigger_payload z poprzedniego wykonania
- Prawy klik na krok w trybie testowym → "Uruchom krok" z własnym inputem

### Lista testów manualnych

**Prereq:** `supabase migration up` + `npm run dev:cms` (localhost:3001)

#### (a) Step Library + Drag & Drop

1. Otwórz edytor workflow → kliknij **Biblioteka** (lewy górny róg canvas)
   - Oczekiwane: panel 240px z 3 sekcjami: Akcje (Wyślij email, Webhook), Logika (Warunek, Opóźnienie), AI (Akcja AI)
2. Kliknij nagłówek sekcji → powinna się zwinąć/rozwinąć
3. Przeciągnij "Akcja AI" z biblioteki i upuść na canvas
   - Oczekiwane: węzeł pojawia się w miejscu upuszczenia
4. Prawy klik na nowo dodany węzeł → menu "Usuń krok" w kolorze czerwonym
5. Prawy klik na węzeł Trigger → brak menu (trigger chroniony)
6. Kliknij "Usuń krok" → węzeł i krawędzie znikają

#### (b) Variable Inserter (grupowany)

7. Stwórz workflow: Trigger → Warunek → Wyślij email (połączone krawędziami)
8. Kliknij węzeł **Wyślij email** → panel konfiguracyjny
9. Kliknij przycisk **Zmienne** przy polu "Do:"
   - Oczekiwane: popover z grupami: "Trigger" (zmienne triggera) + "Krok 1: Warunek" (branch)
   - NIE powinny być widoczne zmienne z kroków downstream
10. Kliknij węzeł **Warunek** → otwórz Zmienne
    - Oczekiwane: tylko "Trigger" — Warunek jest bezpośrednio po triggerze, brak upstream kroków

#### (b) AI Action — prompt + output schema

11. Kliknij węzeł Akcja AI → panel konfiguracyjny
12. W polu Prompt wpisz tekst, użyj Zmienne do wstawienia `{{clientName}}`
13. Kliknij **+ Dodaj pole** dwukrotnie, wypełnij: key=`sentiment`, label=`Sentyment`
    - Oczekiwane: podpowiedź zmienia się z "Domyślne pola" na "zostaną zastąpione polami niestandardowymi"
14. Zapisz workflow (Ctrl+S)
15. Dodaj krok po Akcji AI, kliknij go → Zmienne powinny zawierać `{{sentiment}}` w grupie "Krok N: Akcja AI"

#### (c) Test Mode — dry-run

16. Kliknij przycisk **Test** (kolba) w headerze → TestModePanel otwiera się po prawej
17. Sprawdź że JSON jest pre-populated danymi zgodnymi ze schematem triggera
18. Edytuj JSON (np. zmień `clientName`) → kliknij **Uruchom test**
    - Oczekiwane: loading → po zakończeniu canvas pokazuje kolorowe ringi na węzłach
    - Zielony ring = completed, czerwony = failed, wyszarzony = skipped
19. Rozwiń wynik kroku w liście → widać input_payload i output_payload (mock)
20. Sprawdź że w historii wykonań (`/admin/workflows/executions`) dry-run NIE jest widoczny

#### (c) Test Mode — replay + single step

21. W TestModePanel przełącz na tab **Z wykonania**
    - Jeśli są poprzednie wykonania: wybierz jedno → JSON powinien się załadować z trigger_payload
22. W trybie testowym (po uruchomieniu testu): prawy klik na krok → "Uruchom krok"
    - Oczekiwane: dialog z polem JSON input
23. Wpisz `{}` → kliknij Uruchom → wynik widoczny (mock output lub błąd)

---

## Cleanup wykonany w Notion (2026-04-10)

- AAA-T-103 → Cancelled (Google Calendar token refresh — Baikal zastąpił)
- AAA-T-158 → On Hold (workflow backlog placeholder)
- AAA-T-176 → przeniesiony z P-8 do P-4
- 5 projektów → dodane prefiksy [AAA-P-X]
- AAA-P-10 → priorytet Medium
- AAA-T-155 → To Do / Medium, AAA-T-156 → To Do / Medium
- AAA-T-161 → To Do / High, AAA-T-169 → To Do / Low
