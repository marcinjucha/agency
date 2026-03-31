# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-03-30)

**Status:** Iterations 1-5 done (DB schema, CMS foundation, product list, media folders, product editor). Side project.
**Scope:** E-commerce: Both Kolega (pallets) AND Tata (books) are catalog-only with external links (NO Stripe). Single Supabase, CMS extended (`features/shop-*`), separate frontends under `apps/shop/tata/` and `apps/shop/kolega/` (nested, not flat). Tata first.
**Key decisions:** `shop_` prefixed tables, `listing_type` PostgreSQL ENUM, `gallery`/`editorial` display_layout (intent-based naming), `NUMERIC(10,2)` for price, `TEXT[]` for tags, flat categories.
**Tata purchase:** Zolix for paid books (external_link), S3 for free materials (digital_download). Books are digital only. Cookie banner reused, Plausible for analytics.
**Tata design:** Dark + warm amber ("library at night"), serif headings + sans body, editorial layout for book detail, minimal 3-link nav.
**Dual PROJECT_SPEC:** `docs/PROJECT_SPEC.yaml` (AAA-P-4) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9).
**Plan:** 10 iterations. Graph: 1→2→[3+4]→5→[7+8]→9→10. Critical: 1→2→5→7→10.

## Workflow Engine — AAA-P-4 — IN PROGRESS (2026-03-31)

**Status:** Iterations 1-6 done (DB schema, CMS types/queries/validation, execution list UI, enhanced email templates with variable system, visual builder canvas with reactflow + 4 UX improvements, config panels with save/load, execution engine). Next: iteration 7. Extends Core CMS (AAA-P-4). 11 Notion tasks with "Workflow:" prefix.
**Scope:** Per-tenant workflow automation. Two-layer: CMS (routing/config) + n8n (heavy execution). Visual builder (reactflow), explicit save, dynamic email template variables.
**Key decisions:** Circular trigger protection (max depth=1 via triggering_execution_id self-FK), delay via n8n cron (±5 min), coexistence with current n8n email.
**Execution engine (iter 6):** Engine in `features/workflows/engine/` (feature-local, NOT package). API `/api/workflows/trigger` with Bearer token (WORKFLOW_TRIGGER_SECRET). Sync steps (condition, webhook) in CMS, async steps (send_email, ai_action, delay) dispatch to n8n generic dispatcher. `workflow_id` param for targeting specific workflow. `is_active` check at API level (404/422 for inactive). Service role client for engine writes. Variable context accumulates — each step's outputPayload merged into context for later steps via {{mustache}}.
**DB tables:** workflows, workflow_steps, workflow_edges (DAG), workflow_executions, workflow_step_executions (two-level execution tracking).
**Type strategy:** trigger_type and step_type as TEXT (not ENUM) — ENUMs can't be extended inside transactions, TEXT + Zod validation more extensible for growing type sets. (2026-03-31)
**Email template linking:** Partial unique index on email_templates — system types (form_confirmation) 1-per-tenant, workflow_custom unlimited. Steps link by template ID in step_config. (2026-03-31)
**Execution RLS:** workflow_executions.tenant_id denormalized from workflows for direct RLS without join. Execution tables SELECT-only for CMS users, n8n writes via service_role. (2026-03-31)
**Canvas save:** Delete-all-edges + re-insert (edges lightweight, no identity); steps use ID-based upsert diffing. (2026-03-31)
**Backlog:** Manual cancel/retry executions, manual triggers — nice-to-have, not MVP.
**Plan:** 11 iterations. Graph: 1→2→[3+4]→5a→5b→[6+7]→[8+9]→10. Critical: 1→2→5a→5b→6→10.

## Roadmap & Planning (2026-03-30)

**Priority order:** workflow engine → email triggers → client onboarding.
**Key decision:** NIE hardcode'ować emaili w n8n osobno — workflow engine najpierw, emaile potem jako triggery.
**Backlog:** Multi-language, CRM/Slack, Reporting, Onboarding, Newsletter, booking_cancellation.

## Completed Features (compressed)

- **Email Notifications** (2026-03-13) — Phase 1 (n8n form_confirmation) + Phase 2 (CMS template editor + live preview). Done.
- **Media Library** (2026-03-24) — Multi-tenant, S3, 6 types, folder tree with DnD (added 2026-03-30). Video limit: 50MB.
- **CTA → Survey Flow** (2026-03-24) — 7 questions, scoring max 15 pkt, AI via MiniMax-M2.7 in n8n.
- **Intake Hub** (2026-03-28) — @dnd-kit kanban, JIRA-style split view, autosave notes.
- **Survey Improvements** (2026-03-30) — Tally-style redesign. Key: `semantic_role` on Question (rendering vs business semantics). Shared DatePicker in @agency/ui.
- **SEO Foundations** (2026-03-29) — `site_settings` table, OG/Twitter meta, JSON-LD, sitemap.
- **Architecture Audit** (2026-03-25) — Complete. Deferred items in Notion.

## Feedback & Corrections

- **"dawaj auto" / "auto" = switch to auto mode** — All phases without confirmation. BUT: always stop at Phase 5 (manual testing). (2026-03-23)
- **No backward compatibility (pre-launch only)** — No clients/content yet. Once clients onboard, backward compat required. (2026-03-23)
- **Test after each priority level, not each fix** — Batch: fix all P0 → test → fix P1 → test → fix P2 → test. (2026-03-25)
- **Commit per change, test later** — Individual commits, deferred manual testing. (2026-03-25)
- **"wracamy do manuala" = switch back to manual mode** — Confirmation after each phase. "Auto" mode was session-scoped only, not permanent. (2026-03-31)
- **"do all now" = don't defer P2 items** — When design agent recommends deferring P2 items, user overrides and wants all implemented immediately. Don't defer unless explicitly asked. (2026-03-31)
- **workflow_id targeting over "all matching"** — User didn't want all matching workflows to fire on trigger. API accepts workflow_id for specific execution. (2026-03-31, AAA-T-149)
- **Explicit errors for inactive workflows** — API returns 404/422 for inactive workflows instead of silent 202. User wants clear feedback. (2026-03-31, AAA-T-149)

## Bugs Found (project-specific patterns)

- **Zod .nullable().optional() for DB nullable** — `z.string().optional()` accepts undefined but NOT null. DB stores null. Fix: `.nullable().optional()`. Recurring across features. (2026-03-27)
- **useMutation + Server Action structured return = silent failure** — TanStack Query treats non-thrown results as success. Fix: throw on `!result.success`. Recurring. (2026-03-27)
- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. Also: `db:types` uses --local, need --linked when local not running. (2026-03-28)
- **Supabase JS v2.95.2 `as any` needed even for SELECT** — `.from('shop_products')` resolves to `never` in complex chains. Upgrade may fix. (2026-03-30)
- **handleSubmit needs onFormError callback** — Without it, validation errors silently swallowed. Also: empty number inputs send NaN → add Zod transforms NaN/''→null. (2026-03-30)
- **Label duplication between OPTIONS arrays and LABELS records** — types.ts OPTIONS and utils.ts LABELS both defined labels independently. Fix: derive OPTIONS from LABELS (single source of truth in types.ts). Watch for this pattern in future features. (2026-03-31)
- **Dead message keys from missing type variants** — stepExecutionCancelled message defined but StepExecutionStatus type had no 'cancelled' variant. Fix: remove dead keys or add missing type variants. (2026-03-31)
- **Partial unique index breaks ON CONFLICT upsert** — email_templates had UNIQUE(tenant_id, type) replaced with partial unique index (WHERE type != 'workflow_custom'). PostgreSQL cannot use partial indexes for ON CONFLICT targeting. Fix: replace upsert with select→maybeSingle then update/insert. (2026-03-31)
- **Turbopack barrel re-export in email/types.ts** — `export { X } from '@agency/email'` causes SSR chunk loading failure. Same known Turbopack bug, new location. Fix: import-then-re-export (`import { X } from 'module'; export const Y = X`). (2026-03-31)
- **Debounce useEffect fires on mount → false dirty state** — onChange callback in debounced useEffect runs immediately on mount, marking form dirty before user interaction. Fix: `isFirstRender` ref mount guard that skips first execution. (2026-03-31)
- **Stale closure in debounced useEffect** — onChange not in useEffect deps causes stale reference. Fix: `onChangeRef` pattern (useRef updated on every render, useEffect reads `.current`). (2026-03-31)
- **revalidatePath does NOT invalidate TanStack Query cache** — Need BOTH revalidatePath + invalidateQueries after mutations. (2026-03-31) [Pattern: ag-nextjs-patterns "Dual Cache Invalidation"]
- **Webhook handler success on 4xx/5xx** — `fetch()` doesn't throw on HTTP errors. Must check `response.ok`. (2026-03-31, AAA-T-149)
- **Race condition on concurrent n8n callbacks** — Multiple n8n steps completing simultaneously can corrupt execution state. Fix: optimistic lock + idempotency guard on callback route. (2026-03-31, AAA-T-149)
- **Circular protection depth off-by-one** — depth=1 is valid (A triggers B). Block at depth>=2 (A→B→C). Initial impl blocked depth=1 too aggressively. (2026-03-31, AAA-T-149)
- **SSRF in webhook handler** — User-configured webhook URLs could target private IPs. Fix: private IP blocklist before fetch + AbortSignal.timeout(10_000). (2026-03-31, AAA-T-149)

## Domain Concepts

- **Plausible Analytics** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. No cookies = no RODO. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`. S3 public GET; CORS must allow PUT from CMS domains. (2026-03-18)
- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953. (2026-03-23)
- **deleteAppointment does NOT remove Google Calendar event** — DB row deleted only. Notion ticket created. (2026-03-28)
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`). (2026-03-27)
- **notification_email is per survey_link, not per tenant** — Each link has own notification address. (2026-03-27)

## Architecture Decisions

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency. (2026-03-27)
- **pgcrypto for API key encryption** — `email_configs_decrypted` view for n8n. API key masked in client. (2026-03-27)
- **Cross-project update rule** — When AAA-P-9 tasks affect core CMS, update BOTH PROJECT_SPECs. (2026-03-30)
- **getMediaItems folder_id filter: undefined=all, null=root, string=folder** — Critical backward compat: default undefined returns ALL items. null ≠ default. (2026-03-30)
- **trigger-schemas.ts in lib/ (not features/)** — Cross-feature variable registry shared between email and workflow features. lib/ is correct for shared infrastructure. features/email imports from lib/trigger-schemas.ts. (2026-03-31)
- **VariableInserterPopover in packages/ui/** — Shared component with local VariableItem interface (avoids packages→apps import boundary violation). Structurally compatible with TriggerVariable from apps/cms/. (2026-03-31)
- **Hybrid variable architecture: registry + JSONB cache** — trigger-schemas.ts is source of truth (TypeScript). template_variables JSONB is lazy cache written on save for n8n (which can't call TypeScript). CMS always reads from registry, writes snapshot to DB. (2026-03-31)
- **form_confirmation as registry key** — Standalone templates (form_confirmation) are just another entry in TRIGGER_VARIABLE_SCHEMAS. No special case, same variable system for workflow and non-workflow templates. (2026-03-31)
- **NODE_TYPE_REGISTRY centralized** — node-styles.ts + WorkflowCanvas nodeTypes + AddNodeDropdown ITEMS were scattered. Centralized into node-registry.ts: NODE_TYPE_CONFIGS (config-only, safe outside dynamic boundary) and NODE_COMPONENTS (inside boundary). Adding new node type = 2 files. (2026-03-31)
- **PANEL_REGISTRY for config panels** — Maps stepType → React component, mirrors NODE_TYPE_CONFIGS. Adding new config panel = new file + registry entry. (2026-03-31) [Pattern: ag-coding-practices "Naturally Extensible Systems"; boundary rules: ag-architecture "Dynamic Import Boundary"]
- **300ms debounced onChange for config panels** — Real-time canvas feedback without Apply button. Explicit Save persists to DB. triggerType passed in ConfigPanelProps for variable inserter context. (2026-03-31)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — Flexibility to partially complete and pause. (2026-03-23)
- **/develop command: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merge to main. (2026-03-26)
- **JIRA-style split view over Sheet overlay** — Inline 480px panel on xl+, full page on smaller screens. (2026-03-28)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter. (2026-03-28)
- **Cross-project task organization** — Infrastructure tasks live where their "home" is (AAA-P-4), not consuming project. (2026-03-29)
- **Inline editing over Dialog for simple CRUD** — In-place editing for simple entities. Dialog = overkill for 4 fields. (2026-03-30)
- **Combobox with inline create** — Create related entities without leaving current editor. Popover+Command pattern. (2026-03-30)
- **Variable inserter button needs text label** — Icon-only Braces button too hard to find. Changed to ghost button with "Zmienne" text label for discoverability. (2026-03-31)
- **Horizontal flow (left-to-right) for workflow canvas** — Handle Position.Left (input) → Position.Right (output), not top/bottom. Matches n8n mental model. (2026-03-31)
- **Row click navigates directly to canvas editor** — List row click goes straight to canvas editor, no intermediate detail page. Reduces clicks from 3 to 1. (2026-03-31)
- **Gallery/card view for workflows** — Card grid view option alongside table list. Grid shows workflow name, trigger badge, active dot, timestamp. Toggle persists to localStorage. (2026-03-31)
- **Trigger creation in canvas, not dialog** — Trigger type set on canvas itself, not in CreateWorkflowDialog. Dialog simplified to name+description only. DB trigger_type defaults to 'manual'. Save syncs trigger_type from canvas. (2026-03-31)
- **560px config panel width** — 480px too tight for form-heavy config panels (select dropdowns, variable inserters, expression fields). 560px confirmed as right size. (2026-03-31)
- **VariableInserter reuse in all expression/email fields** — Reuse VariableInserterPopover from packages/ui/ in workflow config panels wherever trigger context variables are available (e.g., to_expression in send_email). (2026-03-31)
- **Config panel registry = extensible pattern** — Easy addition of new step types without changing existing panels. UpdateStatus panel deferred from 5b — implement when needed. (2026-03-31)
