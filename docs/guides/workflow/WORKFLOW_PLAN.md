# Workflow Engine — Remaining Plan

> Updated: 2026-04-01 | Architecture: [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) | Nodes: [WORKFLOW_NODES.md](./WORKFLOW_NODES.md)

**Done:** Iterations 1-10 (DB schema, CMS foundation, list+CRUD, email templates, visual builder canvas+panels, execution engine, delay step, execution logs UI, booking+lead_score triggers, polish+templates+E2E)

**Remaining:** 1 iteration (11 — nice-to-have backlog)

## Dependency Graph

```
[7 DONE] ──────────────────────────────→ [10: Polish + Templates + E2E] ──→ [11: Backlog]
                                            ↑
[6 DONE] ──→ [8: Execution Logs UI] ──────┘
                                            │
[6 DONE] ──→ [9: Booking + Lead Triggers] ─┘
```

- **8 + 9 parallel** — both depend only on iter 6 (done), no dependency between them
- **10** depends on 8 + 9
- **11** nice-to-have backlog, not MVP

## Iteration Details

| # | Task | Notion ID | Size | Status | Deliverables |
|---|------|-----------|------|--------|-------------|
| ~~**7**~~ | ~~Delay Step (n8n cron + resume)~~ | ~~AAA-T-150~~ | ~~M~~ | **Done** | ~~n8n "Workflow Delay Processor" cron (co 5 min), `/api/workflows/process-due-delays` + `/api/workflows/resume` routes, delay handler in `action-handlers.ts`, `claim_due_delay_steps()` RPC, paused/waiting state~~ |
| ~~**8**~~ | ~~Execution Logs UI~~ | ~~AAA-T-151~~ | ~~M~~ | **Done** | ~~`ExecutionList.tsx`, `ExecutionDetail.tsx`, `ExecutionStatusBadge.tsx`, routes `/admin/workflows/executions/`, `/admin/workflows/executions/[id]/`, sidebar "Historia", polling, step timeline with collapsible JSON payloads~~ |
| ~~**9**~~ | ~~Booking + Lead Score Triggers~~ | ~~AAA-T-152~~ | ~~S~~ | **Done** | ~~booking_created in `calendar/booking.ts` (rich payload: appointmentId/responseId/surveyLinkId/clientEmail/appointmentAt), lead_scored from n8n AI analysis workflow via HTTP Request node, condition evaluator strips {{}} mustache syntax, HOST_URL reused for website→CMS~~ |
| ~~**10**~~ | ~~Polish + Default Templates + E2E~~ | ~~AAA-T-153~~ | ~~M~~ | **Done** | ~~3 default workflow templates, `WorkflowTemplateSelector.tsx`, error handling (per-step try/catch, timeout 5 min, max steps), E2E: survey → workflow → email~~ |
| **11** | Backlog (nice-to-have) | AAA-T-158 | ? | Inbox | Manual cancel/retry executions, real-time status view |

## Execution Order

1. ~~**Session A:** Iter 7 (Delay Step) + Iter 9 (Triggers) — parallel~~ **DONE** (iter 7 completed)
2. ~~**Session B:** Iter 8 (Execution Logs UI)~~ **DONE**
3. ~~**Session C:** Iter 9 (Booking + Lead Triggers)~~ **DONE**
4. ~~**Session D:** Iter 10 (Polish + E2E)~~ **DONE**
5. **Optional:** Iter 11 (Backlog)
