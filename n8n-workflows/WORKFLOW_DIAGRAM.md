# N8n Survey Analysis Workflow - Visual Diagrams

## Main Workflow Flow

```mermaid
graph TB
    A[Webhook Trigger<br/>POST /webhook/survey-analysis] -->|responseId<br/>surveyId<br/>tenant_id<br/>answers| B[Supabase: Fetch Survey<br/>Get questions array]
    B -->|survey with<br/>questions| C[Function: Transform Q&A<br/>Build AI prompt]
    C -->|formatted<br/>prompt| D[HTTP: Claude Haiku API<br/>AI Analysis]
    D -->|JSON response<br/>with scores| E[Function: Parse Output<br/>Extract qualification]
    E -->|ai_qualification<br/>JSONB| F[Supabase: Update Response<br/>Save to database]
    F -->|Success| G[End]
    F -.->|Error| H[Sentry: Log Error<br/>GlitchTip]
    H --> I[Error Logged]

    style A fill:#e1f5ff
    style D fill:#fff4e1
    style F fill:#e7f5e1
    style H fill:#ffe1e1
```

---

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant W as Website API
    participant N as N8n Webhook
    participant S1 as Supabase (Read)
    participant F1 as Transform Function
    participant C as Claude Haiku
    participant F2 as Parse Function
    participant S2 as Supabase (Write)
    participant G as GlitchTip

    W->>N: POST /webhook/survey-analysis<br/>{responseId, surveyId, answers}
    N->>S1: Fetch survey by ID
    S1-->>N: Return survey with questions[]
    N->>F1: Process Q&A pairs
    F1-->>N: Return formatted prompt
    N->>C: POST /v1/messages<br/>{prompt, model, max_tokens}
    C-->>N: Return JSON analysis<br/>{scores, summary, recommendation}
    N->>F2: Parse AI response
    F2-->>N: Return structured JSONB
    N->>S2: UPDATE responses SET<br/>ai_qualification = {...}
    alt Success
        S2-->>N: Update successful
        N-->>W: 200 OK
    else Error
        S2-->>N: Update failed
        N->>G: Log error with context
        G-->>N: Error logged
        N-->>W: 500 Error
    end
```

---

## Database Schema

```mermaid
erDiagram
    SURVEYS ||--o{ RESPONSES : has
    SURVEYS {
        uuid id PK
        uuid tenant_id FK
        text title
        jsonb questions
        timestamp created_at
        timestamp deleted_at
    }
    RESPONSES {
        uuid id PK
        uuid survey_id FK
        jsonb answers
        jsonb ai_qualification
        enum status
        timestamp created_at
        timestamp updated_at
    }
    RESPONSES ||--|| AI_QUALIFICATION : contains
    AI_QUALIFICATION {
        int urgency_score
        int complexity_score
        int value_score
        int success_probability
        float overall_score
        text summary
        enum recommendation
        array notes_for_lawyer
        timestamp analyzed_at
        text model
        text version
    }
```

---

## AI Qualification Structure

```mermaid
graph LR
    A[ai_qualification JSONB] --> B[Scores]
    A --> C[Analysis]
    A --> D[Metadata]

    B --> B1[urgency_score: 0-10]
    B --> B2[complexity_score: 0-10]
    B --> B3[value_score: 0-10]
    B --> B4[success_probability: 0-10]
    B --> B5[overall_score: weighted avg]

    C --> C1[summary: 1-2 sentences]
    C --> C2[recommendation: ENUM]
    C --> C3[notes_for_lawyer: array]

    D --> D1[analyzed_at: timestamp]
    D --> D2[model: claude-haiku-4-5]
    D --> D3[version: 1.0]

    C2 --> E1[QUALIFIED]
    C2 --> E2[DISQUALIFIED]
    C2 --> E3[NEEDS_MORE_INFO]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e7f5e1
    style D fill:#f0e1ff
```

---

## Score Calculation

```mermaid
graph TB
    A[4 Input Scores<br/>0-10 each] --> B[Weighted Average]
    B --> C[Overall Score<br/>0-10]

    A1[Urgency: 30%] --> B
    A2[Value: 30%] --> B
    A3[Success: 25%] --> B
    A4[Complexity: 15%] --> B

    B --> D{Score Range}
    D -->|8-10| E[High Priority<br/>QUALIFIED]
    D -->|5-7| F[Medium Priority<br/>Review Needed]
    D -->|0-4| G[Low Priority<br/>DISQUALIFIED]

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#90EE90
    style F fill:#FFD700
    style G fill:#FF6B6B
```

---

## Error Handling Flow

```mermaid
graph TB
    A[Node Execution] --> B{Success?}
    B -->|Yes| C[Continue to Next Node]
    B -->|No| D[Retry Logic]

    D --> E{Retry Count < 3?}
    E -->|Yes| F[Wait 5 seconds]
    F --> A
    E -->|No| G[Fire Sentry Node]

    G --> H[Send to GlitchTip]
    H --> I{Error Type}
    I -->|Network| J[Log: Connection Failed]
    I -->|Auth| K[Log: Credential Invalid]
    I -->|Data| L[Log: Invalid Payload]

    C --> M[Workflow Continues]
    J --> N[Workflow Stops]
    K --> N
    L --> N

    style B fill:#fff4e1
    style E fill:#fff4e1
    style G fill:#ffe1e1
    style N fill:#ff6b6b
    style M fill:#90EE90
```

---

## Status Transition Logic

```mermaid
stateDiagram-v2
    [*] --> new: Response Created
    new --> qualified: AI Recommendation = QUALIFIED
    new --> disqualified: AI Recommendation = DISQUALIFIED
    new --> new: AI Recommendation = NEEDS_MORE_INFO

    qualified --> in_progress: Lawyer Claims
    in_progress --> scheduled: Meeting Scheduled
    scheduled --> completed: Meeting Done

    disqualified --> [*]: No Action Needed

    note right of new
        Initial state when
        response is submitted
    end note

    note right of qualified
        High-value lead
        Lawyer should follow up
    end note

    note right of disqualified
        Low-value or unsuitable
        No follow-up needed
    end note
```

---

## Credential Flow

```mermaid
graph TB
    A[N8n Credentials Store<br/>Encrypted at Rest] --> B[Anthropic API]
    A --> C[Supabase]
    A --> D[GlitchTip]

    B --> B1[HTTP Header Auth<br/>x-api-key: sk-ant-...]
    C --> C1[Service Role Key<br/>eyJhbG...]
    D --> D1[Sentry DSN<br/>https://...@glitchtip]

    B1 --> E[Claude Haiku Node]
    C1 --> F[Supabase Nodes]
    D1 --> G[Sentry Node]

    E --> H[AI Analysis]
    F --> I[Database Operations]
    G --> J[Error Logging]

    style A fill:#f0e1ff
    style B1 fill:#fff4e1
    style C1 fill:#e7f5e1
    style D1 fill:#ffe1e1
```

---

## Integration Architecture

```mermaid
graph TB
    subgraph "Next.js Website App"
        A[Survey Submit API<br/>/api/survey/submit]
    end

    subgraph "N8n Instance"
        B[Webhook Endpoint<br/>/webhook/survey-analysis]
        C[Survey Analysis Workflow]
    end

    subgraph "External Services"
        D[Anthropic API<br/>Claude Haiku 4.5]
        E[Supabase Database<br/>PostgreSQL]
        F[GlitchTip<br/>Error Tracking]
    end

    subgraph "Next.js CMS App"
        G[Response Detail Page<br/>Display AI Analysis]
    end

    A -->|POST<br/>fire-and-forget| B
    B --> C
    C --> D
    C --> E
    C --> F
    E -->|Read| G

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#ffe1e1
    style E fill:#e7f5e1
    style G fill:#f0e1ff
```

---

## Performance Timeline

```mermaid
gantt
    title Workflow Execution Timeline (Target: <10s)
    dateFormat X
    axisFormat %Ss

    section Nodes
    Webhook Trigger         :0, 100ms
    Supabase Fetch         :100ms, 500ms
    Transform Q&A          :600ms, 50ms
    Claude API Call        :650ms, 5000ms
    Parse Output           :5650ms, 50ms
    Supabase Update        :5700ms, 500ms
    Complete               :6200ms, 1ms

    section Critical Path
    Total Time            :0, 6200ms
```

**Typical Execution:** 5-8 seconds
**Target:** <10 seconds
**Bottleneck:** Claude API (2-5s, normal for AI)

---

## Cost Breakdown

```mermaid
pie title Cost per Response ($0.0008 total)
    "Claude API (Input)" : 0.0005
    "Claude API (Output)" : 0.0003
    "Supabase" : 0.0000
    "N8n" : 0.0000
```

**Monthly Cost Projection:**
- 100 responses = $0.08
- 1,000 responses = $0.80
- 10,000 responses = $8.00

---

## Testing Flow

```mermaid
graph TB
    A[Start Testing] --> B[Run STEP 1-3 SQL Queries]
    B --> C[Get Real UUIDs]
    C --> D[Build Curl Command]
    D --> E{Test in N8n UI?}

    E -->|Yes| F[Execute Workflow<br/>Listen for Test Event]
    E -->|No| G[Run Curl Directly]

    F --> H[Watch Nodes Execute]
    G --> H

    H --> I{All Nodes Green?}
    I -->|Yes| J[Check Database]
    I -->|No| K[Check Failed Node]

    J --> L{ai_qualification populated?}
    L -->|Yes| M[✅ Test Passed]
    L -->|No| N[Debug Database Update]

    K --> O[Read Error Message]
    O --> P{Error Type?}
    P -->|401| Q[Fix Credential]
    P -->|404| R[Check UUID]
    P -->|500| S[Check Service Status]

    N --> T[Check Supabase Logs]
    Q --> U[Update Credential]
    R --> V[Get Valid UUID]
    S --> W[Wait and Retry]

    U --> D
    V --> D
    W --> D
    T --> D

    M --> X[Run Next Test Case]

    style M fill:#90EE90
    style K fill:#FF6B6B
    style N fill:#FFD700
```

---

## Monitoring Dashboard (Conceptual)

```mermaid
graph TB
    subgraph "N8n Execution History"
        A[Success Rate: 97%]
        B[Avg Execution: 6.2s]
        C[Last 24h: 150 runs]
    end

    subgraph "GlitchTip Errors"
        D[Total Errors: 3]
        E[Auth Errors: 0]
        F[Network Errors: 2]
        G[Data Errors: 1]
    end

    subgraph "Claude API Usage"
        H[Daily Requests: 150]
        I[Avg Tokens: 1400]
        J[Daily Cost: $0.12]
    end

    subgraph "Database Stats"
        K[Total Responses: 5,234]
        L[AI Analyzed: 4,892 - 93%]
        M[Qualified: 2,156 - 44%]
        N[Disqualified: 1,876 - 38%]
    end

    style A fill:#90EE90
    style D fill:#FFD700
    style J fill:#e1f5ff
    style L fill:#90EE90
```

---

## Future Architecture (Phase 2)

```mermaid
graph TB
    subgraph "Current (Phase 1)"
        A1[Website Submit] -->|webhook| B1[N8n Analysis]
        B1 --> C1[Database Update]
    end

    subgraph "Future (Phase 2)"
        A2[Website Submit] -->|webhook| B2[N8n Analysis]
        B2 --> C2[Database Update]
        B2 --> D2[Email Notification]
        B2 --> E2[Slack Alert]
        B2 --> F2[Calendar Booking]

        G2[CMS Manual Trigger] -->|webhook| B2
        H2[Scheduled Cron] -->|batch process| B2
    end

    C1 -.->|evolution| C2

    style B2 fill:#fff4e1
    style D2 fill:#e7f5e1
    style E2 fill:#f0e1ff
    style F2 fill:#ffe1e1
```

---

## Deployment Checklist Flowchart

```mermaid
graph TB
    A[Start Deployment] --> B{Credentials Ready?}
    B -->|No| C[Get API Keys]
    B -->|Yes| D[Configure N8n Credentials]

    C --> D
    D --> E{Import Workflow}
    E --> F[Update Credential Refs]
    F --> G{Test in N8n UI}

    G -->|Fail| H[Debug with Troubleshooting Guide]
    G -->|Pass| I{Test with Curl}

    H --> G
    I -->|Fail| J[Check Database]
    I -->|Pass| K{All Tests Pass?}

    J --> I
    K -->|No| L[Run More Test Cases]
    K -->|Yes| M[Activate Workflow]

    L --> K
    M --> N{Integrate with Website?}

    N -->|Yes| O[Add Webhook Call to API]
    N -->|No| P[Manual Testing Only]

    O --> Q{Create CMS UI?}
    Q -->|Yes| R[Build ResponseDetail Component]
    Q -->|No| S[✅ Deployment Complete]

    R --> S
    P --> S

    S --> T[Monitor First 100 Executions]

    style S fill:#90EE90
    style H fill:#FFD700
    style J fill:#FFD700
```

---

## Legend

### Colors
- 🔵 **Blue** - Input/Trigger nodes
- 🟡 **Yellow** - Processing/Transform nodes
- 🟢 **Green** - Success states
- 🔴 **Red** - Error states
- 🟣 **Purple** - Metadata/Configuration

### Symbols
- `→` Synchronous flow
- `-.->` Asynchronous/Error flow
- `⬜` Process node
- `◇` Decision point
- `⬭` Data storage

---

**Note:** These diagrams are written in Mermaid syntax and will render in GitHub, GitLab, and many markdown viewers. If your viewer doesn't support Mermaid, you can paste the code into https://mermaid.live/ to see the rendered diagrams.
