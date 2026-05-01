# Workflow Engine — Diagrams

> Updated: 2026-05-01 | All diagrams in Mermaid format | Diagrams 9–12 added for T-210 retry engine

---

## 1. Component Diagram — System Overview

```mermaid
C4Context
    title Workflow Engine — Component Overview

    Person(admin, "Admin", "CMS user building workflows")
    Person(visitor, "Visitor", "Fills surveys, books appointments")

    System_Boundary(cms, "CMS (Next.js on Vercel)") {
        Component(builder, "Workflow Builder", "ReactFlow canvas, config panels, StepLibraryPanel")
        Component(trigger_route, "Trigger Route", "/api/workflows/trigger — fire-and-forget POST to n8n")
        Component(test_panel, "TestModePanel", "Dispatches test runs to real n8n Orchestrator")
        Component(exec_viewer, "Execution Viewer", "Logs, step timeline, canvas status overlay")
        Component(trigger_schemas, "trigger-schemas.ts", "Variable registry per trigger type")
    }

    System_Boundary(n8n, "n8n (Hetzner VPS)") {
        Component(orchestrator, "Workflow Orchestrator", "SplitInBatches loop, staticData state, Switch routing")
        Component(trigger_handler, "Trigger Handler", "Fetches real data from Supabase per trigger type")
        Component(email_handler, "Send Email Handler", "Template resolution + Resend via Send Email subworkflow")
        Component(ai_handler, "AI Action Handler", "Prompt building + MiniMax Agent (Claude Haiku)")
        Component(condition_handler, "Condition Handler", "Expression evaluator + skip propagation")
        Component(delay_handler, "Delay Handler", "Native Wait node, self-managed DB state")
        Component(webhook_handler, "Webhook Handler", "SSRF check + HTTP Request")
        Component(minimax, "MiniMax Agent", "Reusable Claude API wrapper (LangChain node)")
        Component(send_email, "Send Email", "Reusable Resend email sender")
    }

    System_Ext(supabase, "Supabase", "PostgreSQL + RLS + REST API")
    System_Ext(resend, "Resend", "Email delivery")
    System_Ext(claude, "Anthropic API", "Claude Haiku 4.5")

    Rel(admin, builder, "Builds workflows")
    Rel(admin, exec_viewer, "Views execution logs")
    Rel(visitor, trigger_route, "Survey/booking triggers")
    Rel(trigger_route, orchestrator, "POST {workflowId, triggerPayload}")
    Rel(test_panel, orchestrator, "Same POST as production")
    Rel(orchestrator, trigger_handler, "executeWorkflow")
    Rel(orchestrator, email_handler, "executeWorkflow")
    Rel(orchestrator, ai_handler, "executeWorkflow")
    Rel(orchestrator, condition_handler, "executeWorkflow")
    Rel(orchestrator, delay_handler, "executeWorkflow")
    Rel(orchestrator, webhook_handler, "executeWorkflow")
    Rel(ai_handler, minimax, "executeWorkflow")
    Rel(email_handler, send_email, "executeWorkflow")
    Rel(minimax, claude, "API call")
    Rel(send_email, resend, "API call")
    Rel(orchestrator, supabase, "Read/write workflow state")
    Rel(trigger_handler, supabase, "Fetch trigger data")
    Rel(builder, supabase, "CRUD workflows/steps/edges")
```

---

## 2. n8n Orchestrator Internal Flow

```mermaid
flowchart LR
    subgraph Init["Initialization"]
        WH[Webhook] --> SI[Call Sentry Init]
        SI --> VA[Validate Auth<br/>Bearer token]
        VA --> FI["Fetch and Initialize<br/>• Supabase: workflow + steps + edges<br/>• topologicalSort<br/>• Create execution + step records<br/>• Init staticData state"]
    end

    FI --> R202[Respond 202 Accepted]
    FI --> LOOP[SplitInBatches<br/>Loop Over Steps]

    subgraph StepLoop["Step Processing Loop"]
        LOOP --> PCS["Prepare Current Step<br/>• Read state.failed<br/>• Read state.skippedStepIds<br/>• Read state.variableContext<br/>• resolveDeep(step_config)"]

        PCS --> MSR[Mark Step Running<br/>★ dead-end]
        PCS --> RST{"Route by Step Type<br/>Switch (9 outputs)"}

        RST -->|0: failed| SS[Skip Step]
        RST -->|1: __skipped__| PSR
        RST -->|2-6: step types| HANDLERS[Handler<br/>Subworkflow]
        RST -->|7: trigger| TH[Trigger Handler]
        RST -->|8: fallback| UNK[Unknown Type]

        SS --> PSR
        HANDLERS --> PSR
        TH --> PSR
        UNK --> PSR

        PSR["Process Step Result<br/>• Merge outputPayload → state.variableContext<br/>• Accumulate state.skippedStepIds<br/>• Set state.failed on error"]

        PSR --> PG{"Persist Gate<br/>alreadyPersisted?"}
        PG -->|yes| HSF
        PG -->|no| USE[Update Step Execution<br/>★ dead-end]
        PG -->|no| HSF

        HSF["Handle Skipped and Failed<br/>• Batch PATCH skipped steps (status=skipped)<br/>• If item.failed:<br/>  - Mark execution failed<br/>  - Batch PATCH pending/running → cancelled (T-210)<br/>• Clean transient fields"]

        HSF --> LOOP
    end

    LOOP -->|done| CFS[Check Final Status]
    CFS --> CG{"Completion Gate<br/>skipCompletion?"}
    CG -->|no| MEC[Mark Execution Complete]
```

---

## 3. Trigger Handler Internal Flow

```mermaid
flowchart LR
    START[Start<br/>passthrough] --> SWITCH{"Route by<br/>Trigger Type"}

    SWITCH -->|survey_submitted| FSD["Fetch Survey Data<br/>• responses (answers JSONB)<br/>• survey_links<br/>• surveys (questions JSONB)<br/>→ qaContext, surveyTitle,<br/>clientEmail, answers"]

    SWITCH -->|booking_created| FBD["Fetch Booking Data<br/>• appointments<br/>→ appointmentAt, clientEmail,<br/>clientName, notes"]

    SWITCH -->|lead_scored| PLS["Pass Lead Score<br/>→ overallScore, recommendation,<br/>summary (from payload)"]

    SWITCH -->|fallback| PMT["Pass Manual Trigger<br/>→ { triggered: true }"]
```

---

## 4. Variable Context Accumulation

```mermaid
flowchart TD
    T["buildTriggerContext()<br/>{trigger_type, responseId, surveyLinkId}"]
    T --> TH["Trigger Handler<br/>adds: surveyTitle, qaContext,<br/>clientEmail, respondentName,<br/>submittedAt, answers"]
    TH --> C["Condition Step<br/>adds: {branch: 'true'}"]
    C --> AI["AI Action Step<br/>adds: {overallScore: 8,<br/>recommendation: 'QUALIFIED'}"]
    AI --> SE["Send Email Step<br/>can use ALL accumulated:<br/>{{qaContext}}, {{surveyTitle}},<br/>{{overallScore}}, {{recommendation}}"]

    style T fill:#1a1a2e,stroke:#e94560,color:#fff
    style TH fill:#1a1a2e,stroke:#0f3460,color:#fff
    style C fill:#1a1a2e,stroke:#f39c12,color:#fff
    style AI fill:#1a1a2e,stroke:#16a085,color:#fff
    style SE fill:#1a1a2e,stroke:#8e44ad,color:#fff
```

---

## 5. State Management — staticData vs Item Data

```mermaid
flowchart LR
    subgraph Problem["❌ Without staticData"]
        I1["Iteration 1<br/>item.variableContext = {A}"] --> SIB1[SplitInBatches]
        SIB1 --> I2["Iteration 2<br/>item.variableContext = {} ← RESET!"]
    end

    subgraph Solution["✅ With staticData"]
        J1["Iteration 1<br/>state.variableContext = {A}"] --> SIB2[SplitInBatches]
        SIB2 --> J2["Iteration 2<br/>state.variableContext = {A} ← PERSISTS!"]
    end

    style Problem fill:#2d1117,stroke:#f85149
    style Solution fill:#0d1117,stroke:#3fb950
```

---

## 6. Condition Branching — Skip Propagation

```mermaid
flowchart LR
    COND{"Condition<br/>overallScore >= 7<br/>→ branch: 'false'"}

    COND -->|"true (edge)"| SE[Send Email]
    COND -->|"false (edge)"| WH[Webhook]

    SE --> JOIN[Join Step]
    WH --> JOIN

    COND -.->|"skippedStepIds"| SE

    style SE fill:#2d1117,stroke:#f85149,color:#fff
    style WH fill:#0d1117,stroke:#3fb950,color:#fff
    style COND fill:#1a1a2e,stroke:#f39c12,color:#fff
```

When condition evaluates to `false`:
- `true` branch targets (Send Email) → added to `skippedStepIds`
- `false` branch targets (Webhook) → executed normally
- Skip propagates downstream: if ALL incoming edges of a step are from skipped steps, it's also skipped

---

## 7. Database Schema (ER Diagram)

> Updated 2026-05-01: `workflow_executions.workflow_snapshot`, `workflow_step_executions.attempt_number` + `input_payload NOT NULL` + `status: cancelled` added in T-208/T-209/T-210.

```mermaid
erDiagram
    workflows ||--o{ workflow_steps : "has"
    workflows ||--o{ workflow_edges : "has"
    workflows ||--o{ workflow_executions : "tracks"
    workflow_steps ||--o{ workflow_edges : "source/target"
    workflow_executions ||--o{ workflow_step_executions : "details"
    workflow_steps ||--o{ workflow_step_executions : "executed as"
    surveys ||--o{ survey_links : "has"
    survey_links ||--o{ responses : "collects"

    workflows {
        uuid id PK
        uuid tenant_id FK
        text name
        text trigger_type
        boolean is_active
    }

    workflow_steps {
        uuid id PK
        uuid workflow_id FK
        text slug "unique per workflow, user-editable"
        text step_type
        jsonb step_config "_name field drives canvas label"
    }

    workflow_edges {
        uuid id PK
        uuid source_step_id FK
        uuid target_step_id FK
        text condition_branch "null|true|false"
    }

    workflow_executions {
        uuid id PK
        uuid workflow_id FK
        text status "running|completed|failed|cancelled|paused"
        jsonb trigger_payload
        jsonb workflow_snapshot "T-209: frozen definition at execution start"
    }

    workflow_step_executions {
        uuid id PK
        uuid execution_id FK
        uuid step_id FK
        text status "pending|running|completed|failed|skipped|waiting|processing|cancelled"
        int attempt_number "T-209: 1 for first run; 2+ on retry. UNIQUE(execution_id, step_id, attempt_number)"
        jsonb input_payload "T-209: rendered payload BEFORE external call (audit). NOT NULL"
        jsonb output_payload
    }

    responses {
        uuid id PK
        uuid survey_link_id FK
        jsonb answers "questionId→answer"
    }

    surveys {
        uuid id PK
        jsonb questions "array of question objects"
    }
```

---

## 8. Handler Contract — Data Flow Through executeWorkflow

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant EW as executeWorkflow<br/>(autoMapInputData)
    participant H as Handler Subworkflow
    participant DB as Supabase

    O->>EW: item with resolvedConfig,<br/>variableContext, currentStep, edges
    Note over EW: autoMapInputData<br/>+ convertFieldsToString: false<br/>→ objects preserved
    EW->>H: Full item (passthrough)

    H->>DB: Supabase queries (if needed)
    H->>H: Process step logic

    H-->>EW: { ...item, stepResult: {success, outputPayload} }
    Note over H: CRITICAL: ...item spread<br/>preserves orchestrator context
    EW-->>O: Handler output replaces<br/>executeWorkflow input
```

---

## 9. Retry Flow — End to End (T-210)

Retry uruchamiany przez admina z CMS. Wcześniejsze zakończone kroki pomijane (output z cache), nieudane re-runują z aktualnym variableContext.

```mermaid
sequenceDiagram
    participant U as Admin (CMS UI)
    participant B as ExecutionDetail.tsx<br/>Retry Button
    participant E as POST /api/workflows/retry
    participant DB as Supabase
    participant O as n8n Orchestrator<br/>Fetch and Initialize

    U->>B: Kliknij "Spróbuj ponownie"<br/>(AlertDialog confirm)
    B->>E: POST {execution_id}
    Note over E: requireAuthContextFull()<br/>hasPermission('workflows.execute')

    E->>DB: SELECT execution WHERE id=? AND tenant_id=?
    Note over E: Cross-tenant → 404 (nie ujawnia istnienia)

    E->>DB: PATCH execution SET status='running'<br/>WHERE status IN ('failed','cancelled')<br/>RETURNING id
    Note over E: Optimistic lock:<br/>0 rows → 409 Conflict (race condition)

    E->>O: POST {workflowId, tenantId,<br/>...original_trigger_payload,<br/>__retry_execution_id__: executionId}
    E-->>B: 200 {success: true, executionId}
    B->>DB: refetch() — polling pokazuje status 'running'

    Note over O: RETRY MODE DETECTED<br/>(__retry_execution_id__ present)
    O->>DB: SELECT execution (validate workflow_id + tenant_id)
    O->>DB: PATCH execution clear error_message, completed_at
    Note over O: workflow_snapshot z istniejącego execution<br/>= single source of truth dla kroków + edges
    O->>DB: SELECT step_executions ORDER BY attempt_number DESC<br/>(dedup → latest per step_id)
    Note over O: Buduje stepExecMap z istniejących wierszy<br/>NIE INSERTuje nowych step_execution rows<br/>Replay guard obsługuje to per-krok

    loop Każdy krok (topological order z snapshot)
        O->>O: Replay guard: Prepare Current Step
        Note over O: Find Latest Attempt → Decide Replay Action
        alt status = completed (poprzednia próba)
            O->>O: reuse output_payload → __replay__<br/>→ Process Step Result (merge do variableContext)
        else status = cancelled lub failed
            O->>DB: INSERT new step_execution (attempt_number + 1)
            O->>O: Re-run step handler (fresh render)
        end
    end

    O->>DB: UPDATE execution status='completed'
    B->>DB: refetch() — pokazuje 'completed'
```

---

## 10. Replay Guard — Decision Tree per krok (T-209/T-210)

Węzły w `Workflow Process Step`: `Find Latest Attempt → Decide Replay Action → Insert New Attempt`.

```mermaid
flowchart TD
    START["Process Step<br/>(item: currentStep, executionId)"]

    START --> FLA["Find Latest Attempt<br/>SELECT * FROM workflow_step_executions<br/>WHERE execution_id=? AND step_id=?<br/>ORDER BY attempt_number DESC LIMIT 1"]

    FLA --> DRA{"Decide Replay Action<br/>(pure branch — no DB writes)"}

    DRA -->|"prev = null<br/>(first execution)"| CONT["replayAction: 'continue'<br/>→ use existing currentStepExecId<br/>→ Mark Step Running\n→ execute handler"]

    DRA -->|"prev.status = 'completed'"| REUSE["replayAction: 'reuse_completed'<br/>stepType: '__replay__'<br/>→ Skip Step (no handler call)\n→ merge prev.output_payload\n   into variableContext"]

    DRA -->|"prev.status = 'skipped'"| RSKIP["replayAction: 'reuse_skipped'<br/>stepType: '__replay_skipped__'\n→ Skip Step (no handler call)"]

    DRA -->|"prev.status = 'failed'\n lub 'pending' / 'running'"| NEWATTEMPT

    DRA -->|"prev.status = 'cancelled' ⚠️"| NEWATTEMPT

    NEWATTEMPT["replayAction: 'new_attempt'\n_newAttemptNumber = (prev.attempt_number || 1) + 1"]

    NEWATTEMPT --> INA["Insert New Attempt<br/>INSERT workflow_step_executions<br/>{ execution_id, step_id,<br/>  attempt_number: _newAttemptNumber,<br/>  status: 'pending' }<br/>→ update currentStepExecId"]

    INA --> EXEC["execute handler\n(fresh render z aktualnym variableContext)"]

    DRA -->|"prev.status = 'waiting'\n lub 'processing'"| CONT

    style REUSE fill:#0d3b2e,stroke:#3fb950,color:#fff
    style RSKIP fill:#1a1a2e,stroke:#8b949e,color:#fff
    style NEWATTEMPT fill:#2d1117,stroke:#f85149,color:#fff
    style INA fill:#2d1117,stroke:#f85149,color:#fff
    style CONT fill:#1a2a3a,stroke:#58a6ff,color:#fff
```

> **⚠️ Dlaczego `cancelled → new_attempt` a nie `→ continue`:**  
> `continue` używałby istniejącego wiersza z `status='cancelled'`. Mark Step Running zrobiłby UPDATE tego wiersza na `status='running'` — niszcząc historyczny zapis anulowania. `new_attempt` tworzy NOWY wiersz z wyższym attempt_number, zostawiając `cancelled` wiersz nienaruszony jako audit trail.

---

## 11. Step Status State Machine (T-209/T-210)

```mermaid
stateDiagram-v2
    [*] --> pending : INSERT (Fetch and Initialize\nlub Insert New Attempt)

    pending --> running : Mark Step Running\n(UPDATE)

    running --> completed : Update Step Execution\n(handler success)
    running --> failed : Update Step Execution\n(handler error)
    running --> waiting : Delay Handler\n(native Wait node aktywny)
    running --> cancelled : Handle Skipped and Failed\nbatch PATCH gdy wcześniejszy krok failed ⚠️

    waiting --> processing : Delay Handler\n(Wait node wznowiony)
    processing --> completed : Update Step Execution

    pending --> skipped : Handle Skipped and Failed\n(condition branch nie wzięty)
    pending --> cancelled : Handle Skipped and Failed\nbatch PATCH gdy wcześniejszy krok failed ⚠️

    completed --> [*] : terminal
    failed --> [*] : terminal (kwalifikuje do retry)
    skipped --> [*] : terminal
    cancelled --> [*] : terminal (kwalifikuje do retry — new attempt)

    note right of cancelled
        ⚠️ T-210 (Iter 6): batch PATCH
        po wykryciu item.failed
        w Handle Skipped and Failed

        Replay guard: cancelled → new_attempt
        (T-210 Iter 4, Decide Replay Action)
        NIE → continue (niszczyłoby audit trail)
    end note

    note right of failed
        T-210 Iter 8:
        Retry button w CMS widoczny
        gdy execution.status = 'failed'
    end note
```

---

## 12. Execution Data Flow — Fresh vs Retry

Porównanie co się dzieje w DB przy pierwszym uruchomieniu vs retry.

```mermaid
flowchart LR
    subgraph FRESH["🆕 Świeże uruchomienie"]
        direction TB
        F1["POST /api/workflows/trigger\n{workflowId, triggerPayload}"]
        F2["Fetch and Initialize:\n• INSERT workflow_executions (uuid nowy)\n• INSERT step_executions × N (attempt_number=1)\n• topologicalSort(live DB steps + edges)\n• workflow_snapshot = frozen definition"]
        F3["Loop kroków:\nMark Running → Handler → Update Execution\nattempt_number zawsze = 1"]
        F4["Koniec:\nUPDATE execution status='completed/failed'"]
        F1 --> F2 --> F3 --> F4
    end

    subgraph RETRY["🔄 Retry (T-210)"]
        direction TB
        R1["POST /api/workflows/retry\n{execution_id}\n↓\noptimistic lock: status failed→running\n↓\nPOST orchestrator z __retry_execution_id__"]
        R2["Fetch and Initialize (retry branch):\n• NIE tworzy nowego execution row\n• NIE tworzy nowych step_execution rows\n• workflow_snapshot z ISTNIEJĄCEGO execution\n  (NIE re-fetches live DB)\n• stepExecMap = SELECT latest per step_id"]
        R3["Loop kroków (replay guard per-step):\n• completed → reuse output_payload (__replay__)\n• cancelled/failed → INSERT attempt_number+1\n  → Handler (fresh render)\n• skipped → reuse skip"]
        R4["Koniec:\nUPDATE execution status='completed'\nStary failed/cancelled row NADAL w DB\n(audit trail)"]
        R1 --> R2 --> R3 --> R4
    end

    subgraph DB_STATE["📊 Stan DB po retry workflow z 3 krokami\n(krok 1 OK, krok 2 failed, krok 3 cancelled)"]
        direction TB
        S1["workflow_step_executions:\n──────────────────────────────────────\nstep_id │ attempt │ status\n────────┼─────────┼──────────────────\nstep_1  │   1     │ completed  (reused)\nstep_2  │   1     │ failed     (historical)\nstep_2  │   2     │ completed  (new attempt)\nstep_3  │   1     │ cancelled  (historical)\nstep_3  │   2     │ completed  (new attempt)"]
    end

    FRESH -.->|"jeśli execution\nzakończyło się błędem"| RETRY
    RETRY --> DB_STATE

    style FRESH fill:#0d1117,stroke:#3fb950
    style RETRY fill:#1a1228,stroke:#8b5cf6
    style DB_STATE fill:#1a1117,stroke:#e85d4a
```
