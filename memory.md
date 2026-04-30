# Project Memory: Halo Efekt

> Most patterns from prior sessions promoted to skills (`ag-n8n-step-handlers`, `ag-workflow-engine`, `ag-design-patterns`, `ag-dev-workflow`, `ag-coding-practices`, `tanstack-server`) and CLAUDE.md files (root, `n8n-workflows/`, `apps/cms/features/`, `supabase/`, `packages/calendar/`) on 2026-04-30.

## Active Work

**Workflow retry foundation (T-208 + T-209):** Done 2026-04-30. T-210 (user-facing retry button, history UI cancelled rendering, Orchestrator batch PATCH cancellation) — In Progress.
**Shop Platform (AAA-P-9):** Iter 9 (feature flags) + iter 10 (polish/deploy) remaining.

## Bugs Found (project-specific, not yet in skill/CLAUDE.md)

- **`Separator` is NOT exported from `@agency/ui`** — Pre-existing bug. Workaround: `<hr className="border-border" />` until added to ui package barrel. Always verify named imports against `@agency/ui` index.ts before assuming availability — package is incomplete.
- **Validator agent produces confident false-positive CRITICAL findings from static analysis** — Static-only validators flag missing `tenant_id` filters on handlers that actually have them (multi-line security filters escape shallow pattern matching). Treat validator CRITICAL findings as hypotheses until verified by direct file inspection.

## Domain Concepts

- **Tenant "Halo Efekt" production** — email: kontakt@haloefekt.pl, id: `19342448-4e4e-49ba-8bf0-694d5376f953`.
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **notification_email per `survey_link`, not per tenant** — Each link has its own notification address.
- **`surveys.status` DB column is vestigial** — Status computed from `survey_links`. Manual enum management is wrong model.

## Architecture Debt (Open Follow-Ups)

- **`trigger_type` duplicated across 4 files** — `TRIGGER_TYPES` Set in `panels/index.ts` + raw string literals hardcoded in 3 other files (step-registry, orchestrator, handler subworkflow). Needs `TRIGGER_REGISTRY` single-source-of-truth. Each new trigger type means 4 files in sync or workflow silently fails to route.
- **`input_payload` column already existed nullable before T-209 plan** (lesson) — Always grep `packages/database/src/types.ts` for column name AND check latest schema dump before scoping any "add column for feature X" migration. Saves redundant migration + types regen.

## Preferences (Universal Stance)

- **"Gramy long term" applies to architecture even in MVP** — User-facing feature can be deferred (MVP cut) but architecture MUST support future extension without rewriting. Cut UI surface, NOT structural decisions that would force a rewrite. Applied: T-209 chose Continuation-with-attempts so adding Fork later is purely additive.

## Tooling Gaps (Follow-Up)

- **`n8n-builder.mjs add-switch-case` command missing** — Currently only handles Process Step routing. Trigger Handler, Send Email handler routing, and other in-workflow Switch nodes need manual JSON editing when adding new branches. Follow-up: extend with generic `add-switch-case --workflow X --node Y --condition Z` command, `--dry-run` mandatory before mutating.
