# Workflow Engine — Diagrams

> Updated: 2026-04-12 | All diagrams in Mermaid format

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

        HSF["Handle Skipped and Failed<br/>• Batch PATCH skipped steps<br/>• Mark execution failed if needed<br/>• Clean transient fields"]

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
        text step_type
        jsonb step_config
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
        text status "running|completed|failed|paused"
        jsonb trigger_payload
    }

    workflow_step_executions {
        uuid id PK
        uuid execution_id FK
        uuid step_id FK
        text status "pending|running|completed|failed|skipped|waiting"
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
