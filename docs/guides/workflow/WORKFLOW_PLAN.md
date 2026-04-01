# Workflow Engine — Remaining Plan

> Updated: 2026-04-01

**Done:** Iterations 1-7 (DB schema, CMS foundation, list+CRUD, email templates, visual builder canvas+panels, execution engine, delay step)

**Remaining:** 4 iterations (8-11)

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
| **8** | Execution Logs UI | AAA-T-151 | M | To Do | `ExecutionList.tsx`, `ExecutionDetail.tsx`, `ExecutionStatusBadge.tsx`, routes `/admin/workflows/executions/`, sidebar "Historia" |
| **9** | Booking + Lead Score Triggers | AAA-T-152 | S | To Do | booking_created trigger in `calendar/actions.ts`, lead_scored trigger after AI qualification |
| **10** | Polish + Default Templates + E2E | AAA-T-153 | M | To Do | 3 default workflow templates, `WorkflowTemplateSelector.tsx`, error handling (per-step try/catch, timeout 5 min, max steps), E2E: survey → workflow → email |
| **11** | Backlog (nice-to-have) | AAA-T-158 | ? | Inbox | Manual cancel/retry executions, real-time status view |

## Execution Order

1. ~~**Session A:** Iter 7 (Delay Step) + Iter 9 (Triggers) — parallel~~ **DONE** (iter 7 completed)
2. **Session B (current):** Iter 8 (Execution Logs UI) + Iter 9 (Booking + Lead Triggers) — parallel
3. **Session C:** Iter 10 (Polish + E2E)
4. **Optional:** Iter 11 (Backlog)
