# Workflow Engine Extensibility Audit

> Generated: 2026-04-13 | Scope: Adding a new step type (e.g. `sms_notification`)

---

## TL;DR

**14 files** must change to add one step type. ~120–170 lines. ~60% boilerplate, ~15% pure duplication.
Only 4 of 14 registries have TypeScript exhaustive checking — the rest are silent on missing entries.

---

## Registration Tax — Summary Table

| # | File | Change needed | Lines | Type | TS exhaustive? |
|---|------|---------------|-------|------|----------------|
| 1 | `features/workflows/types.ts:8` | Add to `StepType` union | 1 | Boilerplate | — (source) |
| 2 | `features/workflows/types.ts:22` | Add to `STEP_OUTPUT_SCHEMAS` | 3–5 | Unique | ✅ Yes |
| 3 | `features/workflows/types.ts:75` | Add `StepConfigSmsNotification` type | 8–10 | Unique | ✅ Yes |
| 4 | `features/workflows/types.ts:228` | Add to `STEP_TYPE_LABELS` | 1 | Boilerplate | ✅ Yes |
| 5 | `features/workflows/engine/utils.ts:19` | Duplicate output schema (**DRY violation**) | 3–5 | ⚠️ Duplication | ❌ No |
| 6 | `features/workflows/engine/utils.ts:40` | Duplicate label (**DRY violation**) | 1 | ⚠️ Duplication | ❌ No |
| 7 | `features/workflows/validation.ts:44` | Add Zod schema + `stepConfigSchemaMap` entry | 8–12 | Unique | ✅ Yes |
| 8 | `features/workflows/validation.ts:134` | Add to `createStepSchema` z.enum | 1 | Boilerplate | ❌ No |
| 9 | `features/workflows/validation.ts:165` | Add to `saveCanvasSchema` z.enum | 1 | Boilerplate | ❌ No |
| 10 | `features/workflows/components/panels/index.ts:44` | Import + register panel component | 3 | Boilerplate | ❌ No |
| 11 | `features/workflows/components/panels/SmsNotificationConfigPanel.tsx` | **New file** — config panel UI | 60–100 | Unique | ❌ No |
| 12 | `features/workflows/components/nodes/node-registry.ts:32` | Add node visual config | 6 | Semi-unique | ❌ No |
| 13 | `features/workflows/components/WorkflowCanvas.tsx:40` | Add to `NODE_COMPONENTS` map | 1 | Boilerplate | ❌ No |
| 14 | `apps/cms/lib/messages.ts:955` | Add step label string | 1 | Boilerplate | ❌ No |
| 15 | `apps/cms/lib/messages.ts:1064` | Add step library description | 1 | Boilerplate | ❌ No |
| 16 | `features/workflows/templates/workflow-templates.ts:20` | Add to inline union | 1 | Boilerplate | ❌ No |
| 17 | `n8n-workflows/Workflow Orchestrator.json` | Add Switch condition + Execute Workflow node | ~20 JSON | Boilerplate | ❌ No |
| 18 | `n8n-workflows/Step - SMS Notification Handler.json` | **New subworkflow** | 50–100 JSON | Unique | ❌ No |

**Totals:** 12 modified + 2 new = **14 files** | **~120–170 lines** | 10 boilerplate · 4 unique · 2 duplication

---

## Visualization 1 — Registration Flow (Shotgun Surgery Map)

```mermaid
flowchart TD
    NEW["➕ New step type\nsms_notification"]

    subgraph TS["TypeScript Layer (CMS)"]
        T1["types.ts\nStepType union :8\nSTEP_OUTPUT_SCHEMAS :22\nStepConfig discriminated union :75\nSTEP_TYPE_LABELS :228"]
        T2["validation.ts\nZod schema :44\nstepConfigSchemaMap :100\nz.enum createStep :134\nz.enum saveCanvas :165"]
        T3["engine/utils.ts\n⚠️ COPY of output schemas :19\n⚠️ COPY of labels :40"]
        T4["templates/workflow-templates.ts\ninline union :20"]
        T5["engine/types.ts\nisTriggerType() array :66"]
    end

    subgraph UI["UI Layer (CMS)"]
        U1["node-registry.ts\nicon · label · color · category :32"]
        U2["WorkflowCanvas.tsx\nNODE_COMPONENTS map :40"]
        U3["panels/index.ts\nSTEP_PANEL_REGISTRY :44"]
        U4["🆕 SmsNotificationConfigPanel.tsx\nnew component"]
        U5["lib/messages.ts\nlabel :955\ndescription :1064"]
    end

    subgraph N8N["n8n Layer"]
        N1["Workflow Orchestrator.json\nSwitch node condition"]
        N2["🆕 Step - SMS Notification Handler.json\nnew subworkflow"]
    end

    NEW --> T1
    NEW --> T2
    NEW --> T3
    NEW --> T4
    NEW --> U1
    NEW --> U2
    NEW --> U3
    NEW --> U4
    NEW --> U5
    NEW --> N1
    NEW --> N2

    T1 -. "⚠️ duplicated in" .-> T3

    style NEW fill:#f59e0b,color:#000
    style T3 fill:#fee2e2,color:#991b1b
    style T4 fill:#fef3c7,color:#92400e
    style T5 fill:#fef3c7,color:#92400e
```

---

## Visualization 2 — Registry Map (Duplication & Type Safety)

```mermaid
graph LR
    SRC["StepType union\ntypes.ts:8\n✅ source of truth"]

    subgraph SAFE["✅ Exhaustive (TypeScript catches missing entries)"]
        S1["STEP_OUTPUT_SCHEMAS\ntypes.ts:22"]
        S2["StepConfig union\ntypes.ts:107"]
        S3["STEP_TYPE_LABELS\ntypes.ts:228"]
        S4["stepConfigSchemaMap\nvalidation.ts:100"]
    end

    subgraph UNSAFE["❌ Not exhaustive (silent on missing entries)"]
        U1["STEP_PANEL_REGISTRY\npanels/index.ts:44\nRecord&lt;string&gt;"]
        U2["NODE_TYPE_CONFIGS\nnode-registry.ts:32\nRecord&lt;string&gt;"]
        U3["NODE_COMPONENTS\nWorkflowCanvas.tsx:40\nRecord&lt;string&gt;"]
        U4["messages.ts\nno typing"]
        U5["z.enum createStep\nvalidation.ts:134\ninline string[]"]
        U6["z.enum saveCanvas\nvalidation.ts:165\ninline string[]"]
        U7["TemplateStep union\ntemplates/workflow-templates.ts:20\ninline"]
        U8["isTriggerType() array\nengine/types.ts:66\nhand-maintained"]
        U9["n8n Switch node\nOrchestrator.json\nJSON strings"]
        U10["DB step_type column\nmigration SQL\nTEXT, no CHECK"]
    end

    subgraph DUP["⚠️ Duplicated (DRY violation)"]
        D1["STEP_OUTPUT_SCHEMAS copy\nengine/utils.ts:19\n'keep in sync' comment"]
        D2["STEP_TYPE_LABELS copy\nengine/utils.ts:40\nPolish strings inlined"]
    end

    SRC --> SAFE
    SRC -.->|"should derive"| UNSAFE
    S1 -. "⚠️ copied because\nmessages.ts breaks vitest" .-> D1
    S3 -. "⚠️ copied because\nmessages.ts breaks vitest" .-> D2

    style SRC fill:#10b981,color:#fff
    style D1 fill:#fee2e2,color:#991b1b
    style D2 fill:#fee2e2,color:#991b1b
```

---

## Visualization 3 — SOLID Violation Heatmap

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#fff"}}}%%
quadrantChart
    title SOLID Violations by Component
    x-axis Low Coupling --> High Coupling
    y-axis Low Responsibility --> High Responsibility
    quadrant-1 Refactor Priority HIGH
    quadrant-2 Too Many Concerns
    quadrant-3 Acceptable
    quadrant-4 Hidden Dependencies
    types.ts: [0.8, 0.9]
    validation.ts: [0.6, 0.6]
    engine/utils.ts: [0.4, 0.5]
    node-registry.ts: [0.3, 0.3]
    panels/index.ts: [0.3, 0.3]
    WorkflowCanvas.tsx: [0.5, 0.4]
    messages.ts: [0.7, 0.2]
    Orchestrator.json: [0.9, 0.5]
```

### SOLID breakdown

| Principle | Status | Evidence |
|-----------|--------|----------|
| **Open/Closed** | ❌ Violated | 12 existing files must be modified per new step type. No plugin system. |
| **Single Responsibility** | ⚠️ Partial | `types.ts` mixes domain types + output schemas + display labels + dropdown options (~330 lines, 5 concerns) |
| **Liskov Substitution** | ✅ OK | `StepConfig` discriminated union handles this correctly |
| **Interface Segregation** | ⚠️ Partial | `ConfigPanelProps` mixes config data, callbacks, and trigger context |
| **Dependency Inversion** | ❌ Violated | `engine/utils.ts` hard-codes output schemas instead of depending on abstraction; `messages.ts` import issues force duplication |

---

## Visualization 4 — Path to Plugin Architecture

```mermaid
flowchart LR
    subgraph NOW["Current: Centralized Registries"]
        CR1["types.ts"]
        CR2["validation.ts"]
        CR3["node-registry.ts"]
        CR4["panels/index.ts"]
        CR5["engine/utils.ts"]
        CR6["WorkflowCanvas.tsx"]
        CR7["messages.ts"]
        CR8["Orchestrator.json"]
    end

    subgraph IDEAL["Ideal: Single Registration Point"]
        REG["step-registry.ts\n\nregisterStep({\n  type: 'sms_notification',\n  label: '...',\n  icon: MessageSquare,\n  configType: SmsConfig,\n  validationSchema: smsSchema,\n  outputSchema: [...],\n  configPanel: SmsPanel,\n  nodeComponent: ActionNode\n})"]
        AUTO1["✅ STEP_TYPE_LABELS auto-derived"]
        AUTO2["✅ STEP_OUTPUT_SCHEMAS auto-derived"]
        AUTO3["✅ NODE_COMPONENTS auto-derived"]
        AUTO4["✅ stepConfigSchemaMap auto-derived"]
        AUTO5["✅ STEP_PANEL_REGISTRY auto-derived"]
        AUTO6["✅ StepType union auto-derived"]
        REG --> AUTO1
        REG --> AUTO2
        REG --> AUTO3
        REG --> AUTO4
        REG --> AUTO5
        REG --> AUTO6
    end

    NOW -. "refactor →" .-> IDEAL

    style REG fill:#10b981,color:#fff
```

---

## Root Cause: Why `engine/utils.ts` Duplicates

The `messages.ts` file imports from CMS-specific modules that break vitest's module resolution. Rather than fixing the import boundary, `engine/utils.ts` inlined copies with a `// keep in sync` comment. This is the single change that would eliminate 2 of the 18 registration tax items:

**Fix:** Move `STEP_OUTPUT_SCHEMAS` to a framework-agnostic file (no `messages.ts` import), import it in both `types.ts` and `engine/utils.ts`.

---

## Quick Win vs Full Refactor

| Approach | Effort | Eliminates |
|----------|--------|------------|
| Fix `engine/utils.ts` duplication | ~30 min | 2 registration tax items |
| Change `Record<string>` → `Record<StepType>` in UI registries | ~1h | 6 silent failure points |
| Derive `StepType` from `as const` object | ~30 min | Hand-maintained union risk |
| Full plugin/registry pattern | ~1 day | Open/Closed violation entirely |
