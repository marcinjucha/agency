# Workflow Engine — Status & Remaining Plan

> Updated: 2026-04-12 | Architecture: [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md)

## Current State

**Engine v2 (n8n Orchestrator)** — fully operational. CMS executor.ts deleted. All execution in n8n.

| Iteration | Task | Status |
|-----------|------|--------|
| 1-6 | DB schema, CMS foundation, visual builder, execution engine | **Done** |
| 7 | Delay Step (n8n native Wait, not CMS cron) | **Done** |
| 8 | Execution Logs UI | **Done** |
| 9 | Booking + Lead Score Triggers | **Done** |
| 10 | Templates + E2E Polish | **Done** |
| AAA-T-177 | Workflow Builder UX Overhaul (canvas, context menu) | **Done** |
| AAA-T-182 | Per-Step Testing (real n8n dispatch, mock removal) | **Done** |
| AAA-T-183 | n8n Orchestrator Migration (CMS executor → n8n) | **Done** |
| AAA-T-183+ | staticData, Trigger Handler, condition literal fix, CMS variables | **In progress** |

## What's Working

- Visual workflow builder (ReactFlow canvas, drag-and-drop, config panels)
- 6 step types: condition, send_email, ai_action, delay, webhook, trigger
- 5 trigger types: survey_submitted, booking_created, lead_scored, manual, scheduled
- n8n Orchestrator with staticData state management
- Trigger Handler hydrating variableContext with real Supabase data
- Condition branching with skip propagation
- Test mode dispatching to real n8n
- Execution log viewer with canvas status overlay

## Remaining (Backlog)

| Task | Notion ID | Priority | Notes |
|------|-----------|----------|-------|
| Manual cancel/retry executions | AAA-T-158 | Medium | Cancel running execution, retry failed steps |
| Real-time status view | AAA-T-158 | Low | WebSocket/polling for live execution progress |
| Email trigger type | Roadmap | High | Next planned trigger — email receipt → workflow |
| Multi-language support | Roadmap | Low | i18n for trigger-schemas variable labels |
