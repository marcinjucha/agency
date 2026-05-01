# T-210 — Test Scenarios: Retry Engine

> Wymagane przed pushem na produkcję. Scenariusze obejmują n8n (po re-imporcie JSON), CMS endpoint i UI.

**Pre-warunek globalny:** n8n ma zaimportowany zaktualizowany `Workflow Orchestrator.json` i `Workflow Process Step.json`, Supabase credential przypisany, migracja `20260501000000_add_workflows_execute_permission.sql` zaaplikowana (`supabase db push`).

---

## Blok A — Baseline (smoke test)

### A-1: Świeże uruchomienie działa bez zmian

**Cel:** Upewnić się, że T-210 nie zepsuł fresh-mode path.

**Kroki:**
1. Utwórz prosty workflow: `manual trigger → send_email` (valid config)
2. Z TestModePanel kliknij „Uruchom test" z przykładowym payloadem
3. Poczekaj na zakończenie

**Oczekiwany rezultat:**
- Nowy wiersz `workflow_executions` z `status='completed'`
- Dwa wiersze `workflow_step_executions`: trigger (`completed`, `attempt_number=1`) + send_email (`completed`, `attempt_number=1`)
- `workflow_snapshot` w execution row jest wypełniony (nie `{}`)
- Żaden wiersz nie ma `status='cancelled'`

---

## Blok B — Cancellation (Iter 2 / Iter 6)

### B-1: Kroki za nieudanym dostają status `cancelled`

**Cel:** Weryfikacja batch PATCH w `Handle Skipped and Failed`.

**Setup:** Workflow z 4 krokami: `trigger → send_email(valid) → webhook(invalid URL) → send_email(valid)`

**Kroki:**
1. Uruchom workflow (TestModePanel lub prawdziwy trigger)
2. Poczekaj na failure

**Oczekiwany rezultat w DB:**
```sql
SELECT step_id, status, attempt_number, error_message
FROM workflow_step_executions
WHERE execution_id = '<latest>'
ORDER BY created_at;
```

| krok | status | attempt_number |
|------|--------|----------------|
| trigger | `completed` | 1 |
| send_email #1 | `completed` | 1 |
| webhook | `failed` | 1 |
| send_email #2 | `cancelled` | 1 |

- `workflow_executions.status = 'failed'`
- send_email #2: `error_message = 'Cancelled — earlier step failed'`, `completed_at` ustawione

### B-2: Idempotency — podwójny failure nie duplikuje cancel

**Kroki:**
1. Uruchom powyższy workflow ponownie (nowa egzekucja)
2. Ręcznie zmień status send_email #2 na `pending` i odczekaj chwilę
3. Sprawdź DB

**Oczekiwany rezultat:**
- Nadal tylko jeden wiersz z `attempt_number=1` dla send_email #2
- Żadne nowe wiersze nie zostały dodane przez batch PATCH

---

## Blok C — Retry Endpoint (Iter 7)

### C-1: Auth — brak sesji → 403

**Kroki:**
```bash
curl -X POST http://localhost:3001/api/workflows/retry \
  -H 'Content-Type: application/json' \
  -d '{"execution_id":"00000000-0000-0000-0000-000000000000"}'
```

**Oczekiwany rezultat:** `403 {"error":"forbidden"}`

### C-2: Permission — brak `workflows.execute` → 403

**Kroki:**
1. Zaloguj się jako użytkownik `Member` (bez `workflows.execute`)
2. Z DevTools: `fetch('/api/workflows/retry', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({execution_id:'00000000-0000-0000-0000-000000000000'})})`

**Oczekiwany rezultat:** `403 {"error":"forbidden"}`

### C-3: Execution nie istnieje → 404

**Kroki:**
1. Zaloguj się jako Admin
2. POST z poprawnym UUID który nie istnieje w DB:
   `{"execution_id":"11111111-1111-1111-1111-111111111111"}`

**Oczekiwany rezultat:** `404 {"error":"execution_not_found_or_invalid_state"}`

### C-4: Cross-tenant rejection → 404 (nie 403)

**Cel:** Weryfikacja że nie ujawniamy istnienia execution innego tenanta.

**Setup:** Pobierz `execution_id` z innego tenanta z DB.

**Kroki:**
1. Zaloguj się jako Admin tenanta A
2. POST z `execution_id` należącym do tenanta B

**Oczekiwany rezultat:** `404 {"error":"execution_not_found_or_invalid_state"}` — taki sam jak „nie istnieje", nie `403`

### C-5: Optimistic lock — execution nie jest `failed` → 409

**Kroki:**
1. Znajdź execution z `status='completed'` lub `status='running'`
2. POST z tym `execution_id`

**Oczekiwany rezultat:** `409 {"error":"already_running_or_invalid_state"}`

### C-6: Sukces — execution `failed` → dispatch do n8n

**Kroki:**
1. Wykonaj workflow który skończy się failure (np. B-1)
2. POST `/api/workflows/retry` z `execution_id` z kroku 1

**Oczekiwany rezultat:**
- `200 {"success":true, "executionId":"<id>"}`
- `workflow_executions.status` zmienione na `'running'` (optimistic lock)
- n8n Orchestrator otrzymał POST i zaczął przetwarzać
- Po chwili: `workflow_executions.status = 'completed'` (lub nowy `failed` jeśli błąd dalej)

### C-7: Rollback na błędzie dispatchu

**Setup:** Wyłącz n8n (np. `docker stop n8n`) lub ustaw `N8N_WORKFLOW_ORCHESTRATOR_URL` na błędny URL.

**Kroki:**
1. Miej execution z `status='failed'`
2. POST `/api/workflows/retry`

**Oczekiwany rezultat:**
- `502 {"success":false, "error":"..."}`
- `workflow_executions.status` wrócił do `'failed'` (rollback)
- `error_message` zaktualizowany

---

## Blok D — Replay Guard (Iter 4)

### D-1: Retry — completed kroki pomijane (output reused)

**Cel:** Weryfikacja że `completed → __replay__` nie wywołuje handlera ponownie.

**Setup:** Workflow: `trigger → get_response → send_email` gdzie get_response i send_email się powiodły, ale execution failed z innego powodu (np. późniejszy krok).

Albo prostszy setup: Workflow `trigger → webhook(invalid) → send_email` gdzie send_email jest `cancelled`.

**Kroki:**
1. Ustaw send_email z loggingiem (możesz sprawdzić Resend dashboard — ile emaili wysłano)
2. Uruchom workflow — send_email ma `completed`
3. Spowoduj failure w kolejnym kroku
4. Retry execution

**Oczekiwany rezultat:**
- send_email NIE dostaje `attempt_number=2` — brak nowego wiersza
- `status` dla send_email NADAL `completed` (attempt 1)
- W Resend: tylko 1 email (nie 2) — double-send nie nastąpił

### D-2: Retry — `cancelled` krok dostaje nową próbę

**Cel:** Weryfikacja `cancelled → new_attempt` (Iter 4, Decide Replay Action).

**Setup:** Używając workflow z B-1 (send_email #2 ma `cancelled`).

**Kroki:**
1. Napraw webhook (zmień na valid URL)
2. Retry execution z B-1

**Oczekiwany rezultat w DB:**
```sql
SELECT step_id, attempt_number, status
FROM workflow_step_executions
WHERE execution_id = '<id>'
ORDER BY step_id, attempt_number;
```

| krok | attempt | status |
|------|---------|--------|
| trigger | 1 | `completed` (reused) |
| send_email #1 | 1 | `completed` (reused) |
| webhook | 1 | `failed` (historical) |
| webhook | 2 | `completed` (nowa próba) |
| send_email #2 | 1 | `cancelled` (historical — NIENARUSZONY) |
| send_email #2 | 2 | `completed` (nowa próba) |

### D-3: Retry failed kroku z aktualnym variableContext (fresh render)

**Cel:** Weryfikacja że failed step re-renderuje się z bieżącym stanem, nie cached.

**Setup:** Workflow z `send_email` który failował z powodu błędnego `template_id`. Napraw template_id w konfiguracji workflow.

**Kroki:**
1. Retry execution

**Oczekiwany rezultat:**
- Email wysłany z NOWYM (naprawionym) template
- Nie ze starym błędnym — potwierdza fresh render

---

## Blok E — Retry Button UI (Iter 8)

### E-1: Przycisk widoczny — Admin + status `failed`

**Kroki:**
1. Zaloguj się jako Admin (z `workflows.execute`)
2. Otwórz detail page execution z `status='failed'`

**Oczekiwany rezultat:**
- Przycisk „Spróbuj ponownie" widoczny obok „Otwórz w edytorze"
- Icon `RotateCcw` widoczny

### E-2: Przycisk niewidoczny — brak permission

**Kroki:**
1. Zaloguj się jako Member (bez `workflows.execute`)
2. Otwórz detail page execution z `status='failed'`

**Oczekiwany rezultat:** Brak przycisku retry. Tylko „Otwórz w edytorze".

### E-3: Przycisk niewidoczny — status `completed`

**Kroki:**
1. Zaloguj się jako Admin
2. Otwórz detail page execution z `status='completed'`

**Oczekiwany rezultat:** Brak przycisku retry.

### E-4: Przycisk disabled — status `running`

**Kroki:**
1. Uruchom retry execution (z Bloku C)
2. Natychmiast odśwież stronę detail (zanim zakończy się execution)

**Oczekiwany rezultat:**
- Przycisk widoczny ale `disabled`
- Tooltip po najechaniu: „W trakcie ponownego uruchomienia, odśwież za chwilę"
- Icon NIE kręci się (brak `animate-spin` — to tylko przy aktywnym retrying state)

### E-5: Confirm dialog

**Kroki:**
1. Admin, execution `failed` — kliknij „Spróbuj ponownie"

**Oczekiwany rezultat:**
- Dialog z tytułem „Uruchomić ponownie?"
- Opis: „Workflow uruchomi się ponownie. Ukończone kroki zostaną pominięte..."
- Dwa przyciski: „Anuluj" + „Spróbuj ponownie"

### E-6: Anuluj — nie dispatchuje

**Kroki:**
1. Kliknij przycisk retry → dialog otworzony
2. Kliknij „Anuluj"

**Oczekiwany rezultat:**
- Dialog zamknięty
- Żaden POST do `/api/workflows/retry` (zweryfikuj w Network tab DevTools)
- `workflow_executions.status` niezmieniony

### E-7: Sukces — UI odświeża status

**Kroki:**
1. Kliknij retry → Potwierdź w dialogu

**Oczekiwany rezultat:**
- Icon kręci się (`animate-spin`) podczas oczekiwania na odpowiedź
- Po `200`: status badge na stronie zmienia się na `running`
- Po zakończeniu n8n: status zmienia się na `completed` (polling co 10s)

### E-8: Race condition (double-click)

**Kroki:**
1. Kliknij retry → Potwierdź → natychmiast (w ciągu 1s) POST ponownie przez DevTools
2. Drugi POST trafia gdy pierwsze wykonanie jest `running`

**Oczekiwany rezultat:** Drugi POST zwraca `409` — toast lub alert „Workflow jest już w trakcie ponownego uruchomienia"

---

## Blok F — History UI (Iter 9)

### F-1: Cancelled badge — kolor i tooltip

**Kroki:**
1. Otwórz execution detail gdzie kroki mają `status='cancelled'`

**Oczekiwany rezultat:**
- Anulowany krok: szara lewa obwódka (zinc), badge „Anulowany" w szarym tonie
- Hover na badge: tooltip „Nie wykonany — błąd wcześniejszego kroku"

### F-2: Pojedynczy attempt — brak akordeonu

**Kroki:**
1. Otwórz execution detail świeżego workflow (wszystkie `attempt_number=1`)

**Oczekiwany rezultat:**
- Każdy krok pokazuje tylko jeden card
- Żaden krok NIE ma przycisku „Poprzednie próby"

### F-3: Wiele attempts — akordeon widoczny

**Kroki:**
1. Otwórz execution detail PO retry (krok z `attempt_number=1: failed` i `attempt_number=2: completed`)

**Oczekiwany rezultat:**
- Krok pokazuje NAJNOWSZĄ próbę (attempt 2, `completed`) jako główny card
- Pod nim: przycisk „Poprzednie próby (1)" z ikoną `ChevronDown`

### F-4: Expand akordeonu

**Kroki:**
1. Kliknij „Poprzednie próby (1)"

**Oczekiwany rezultat:**
- Akordeon otwiera się pokazując attempt 1 (`failed`) z czerwoną obwódką i error message
- Przycisk zmienia się na „Ukryj poprzednie próby (1)" z `ChevronUp`
- Keyboard: Tab → Enter otwiera akordeon (Radix ARIA)

### F-5: Snapshot labels — izolacja od edycji

**Cel:** Weryfikacja że historical execution używa snapshot labels, nie aktualnej definicji.

**Kroki:**
1. Uruchom workflow ze stepem nazwanym np. „Wyślij powitalny email"
2. Poczekaj na completion
3. W CMS edytuj nazwę kroku na coś innego, np. „Krok X"
4. Otwórz stary execution detail

**Oczekiwany rezultat:**
- Stary execution pokazuje „Wyślij powitalny email" (z workflow_snapshot)
- NIE „Krok X" (aktualna live definicja)

### F-6: Backward compat — legacy execution (pusty snapshot)

**Kroki:**
1. Znajdź execution sprzed T-209 (ma `workflow_snapshot = '{}'`)
2. Otwórz jego detail page

**Oczekiwany rezultat:**
- Strona renderuje się bez błędów
- Labels kroków z live STEP_TYPE_LABELS (fallback tier 3)
- Brak błędów w konsoli

---

## Blok G — Bezpieczeństwo (weryfikacja w DB)

### G-1: `canonicalTenantId` z DB, nie z payloadu

**Kroki:**
1. POST do n8n Orchestrator (bezpośrednio) z `{ __retry_execution_id__: 'id-tenanta-A', tenantId: 'tenant-B' }`

**Oczekiwany rezultat:**
- n8n throws: `[retry] execution.tenant_id mismatch — cross-tenant access denied`
- `workflow_executions` row tenanta A nienaruszony

### G-2: `__retry_execution_id__` nie trafia do variableContext

**Kroki:**
1. Uruchom workflow z krokiem który loguje cały variableContext (np. `send_email` z `body: {{__retry_execution_id__}}`)
2. Trigger retry

**Oczekiwany rezultat:**
- Email body pokazuje `{{__retry_execution_id__}}` jako literal (unresolved)
- NIE jako UUID — pole zostało stripped przed buildTriggerContext

### G-3: `workflow_snapshot` nie eksponuje webhook headers w UI

**Setup:** Workflow z krokiem `webhook` który ma `headers: {"Authorization": "Bearer secret-token"}`.

**Kroki:**
1. Uruchom workflow i poczekaj na completion
2. Otwórz execution detail
3. Sprawdź przez DevTools Network tab response z `/features/workflows/queries`

**Oczekiwany rezultat:**
- Response zawiera `workflow_snapshot.steps[].step_config` dla webhook step
- Pole `headers` jest puste lub nieobecne (sanitized przez `parseWorkflowSnapshot()`)
- `"Authorization"` NIE widoczny w response

---

## Checklist finalna przed deploy

- [ ] A-1: Fresh execution działa (smoke test — regression)
- [ ] B-1: Cancelled steps pojawiają się w DB po failure
- [ ] C-6: Retry endpoint zwraca 200, n8n uruchamia execution
- [ ] D-1: Email nie jest wysyłany podwójnie (no double-send)
- [ ] D-2: `cancelled` krok dostaje `attempt_number=2` po retry
- [ ] E-1/E-2: Permission gate na retry button działa
- [ ] E-5/E-6: Dialog confirmation działa
- [ ] F-3/F-4: Attempts accordion otwiera się poprawnie
- [ ] F-5: Snapshot izoluje labels od live edycji
- [ ] F-6: Legacy execution nie crashuje
- [ ] G-2: `__retry_execution_id__` nie wchodzi do variableContext
