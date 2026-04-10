# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-04-02)

**Status:** Iterations 1-8 done + kolega done. Remaining: iteration 9 (feature flags, Core CMS blocker) + iteration 10 (polish/deploy).
**Scope:** Two shops: Jacek (books, dark amber theme) + Kolega (general merchandise, light linen theme). Catalog-only, NO Stripe. Single Supabase (`shop_` prefix), CMS extended, separate frontends (`apps/shop/jacek/`, `apps/shop/kolega/`).
**Key decisions:** `listing_type` ENUM, `gallery`/`editorial` display_layout, `is_featured BOOLEAN`, flat categories. Dual PROJECT_SPEC: `docs/PROJECT_SPEC.yaml` (AAA-P-4) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9).

## Workflow Builder UX Overhaul — AAA-T-177 + AAA-T-179 — DONE (2026-04-10)

**Status:** XL task, 10 iterations complete. Bundled T-179 (context menu + single step run — user-requested additions beyond original roadmap).
**Scope:** Workflow builder canvas UX improvements, context menu, single step execution.

## Workflow Engine — AAA-P-4 — IN PROGRESS (2026-03-31)

**Status:** Iterations 1-10 done. Iter 11 (cancel/retry/real-time) = backlog.
**Scope:** Per-tenant workflow automation. CMS routing/config + n8n heavy execution. ReactFlow visual builder.
**Key decisions:** trigger_type/step_type as TEXT not ENUM; delay step writes resume_at to DB directly (not n8n); sync steps in CMS, async dispatch to n8n.

## Marketplace Integration — AAA-P-9 — IN PROGRESS (2026-04-02)

**Status:** Iterations 1-10 done (2026-04-03). Manual testing remaining.
**Scope:** OLX + Allegro — publish, sync status, import listings. Bidirectional. Adapter pattern (extensible).
**Key decisions:** 4 standalone n8n workflows (NOT workflow engine). MARKETPLACE_REGISTRY pattern. Per-tenant pgcrypto OAuth. Unique index on (product_id, connection_id). CategorySelector = search/autocomplete. `update_marketplace_tokens()` for token refresh (UPDATE by PK).
**Future:** Auto-publish via workflow engine trigger.

## RBAC System — AAA-T-61 + AAA-T-76 — DONE (2026-04-06)

**Status:** Complete. is_super_admin as boolean (not role). requireAuth() consolidated across 18 files.

## Roadmap & Planning (2026-03-30)

**Priority:** workflow engine → email triggers → client onboarding. **Backlog:** Multi-language, CRM/Slack, Reporting, Onboarding, Newsletter, booking_cancellation.

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
- **Validate after EACH iteration, not batched at end** — Orchestrator was about to skip validation after iteration 2. User corrected mid-session: "Nie zapominaj o wywoływaniu weryfikacji po każdej skończonej iteracji." Run Phase 3+3b validation after EVERY iteration completion, not deferred to a batch at the end. (2026-04-08)

## Bugs Found (project-specific patterns)

- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. Also: `db:types` uses --local, need --linked when local not running. (2026-03-28)
- **Supabase JS v2.95.2 `as any` needed even for SELECT** — `.from('shop_products')` resolves to `never` in complex chains. Upgrade may fix. (2026-03-30)
- **Race condition on concurrent n8n callbacks** — Fix: optimistic lock + idempotency guard on callback route. (2026-03-31, AAA-T-149)
- **SSRF in webhook handler** — User-configured webhook URLs could target private IPs. Fix: private IP blocklist + AbortSignal.timeout(10_000). (2026-03-31, AAA-T-149)
- **{{variable}} syntax in condition evaluator causes silent false** — Mustache syntax `{{fieldName}}` always evaluates to false. Fix: resolveField() strips `{{ }}` wrapper. (2026-04-01, AAA-T-152)
- **ConditionNode handle ID mismatch** — `id="yes"`/`id="no"` handles vs executor `'true'`/`'false'`. ReactFlow silently drops edges. Fix: use `id="true"`/`id="false"`. (2026-04-01, AAA-T-153)
- **Template trigger node synthetic (UUID lost on remount)** — Synthetic trigger UUID changes each mount → edges can't persist. Fix: add trigger as real workflow_step in templates. (2026-04-01, AAA-T-153)
- **Type/DB column name mismatch in manually written types** — Always cross-reference migration SQL when writing manual types. 3 mismatch types: phantom columns, wrong names, missing columns. (2026-04-02, AAA-T-157)
- **fromSupabaseVoid() — `.map(() => undefined)` silently discards Supabase errors** — Supabase delete/update without `.select()` returns `{data, error}` but chaining `.map(() => undefined)` on the neverthrow Result discards the error path. Needs dedicated `fromSupabaseVoid()` helper that checks error before discarding data. (2026-04-08)
- **Supabase local can't persist custom GUCs** — `ALTER DATABASE/ROLE SET "app.encryption_key"` fails with "permission denied" in local Supabase. Fix: COALESCE fallback in RPC functions: `COALESCE(NULLIF(current_setting('app.encryption_key', true), ''), 'local-dev-encryption-key')`. (2026-04-09)
- **PostgREST schema cache stale after db reset** — New tables/views/functions invisible to PostgREST until `docker restart supabase_rest_<project>` or `NOTIFY pgrst, 'reload schema'`. Causes "Could not find table/function in schema cache" errors. (2026-04-09)
- **Turbopack barrel re-export bug with server-only packages** — `export { RUNTIME_VALUE } from '@agency/calendar'` in types.ts pulled googleapis (Node.js child_process) into client bundle. Fix: define runtime constants locally, only use `export type` for cross-package re-exports. (2026-04-09)
- **Pre-existing migration seed bugs with hardcoded tenant IDs** — 3 migrations had hardcoded production tenant ID causing FK violations on local db reset. Fixed with WHERE EXISTS guards. Always guard seed data with existence checks. (2026-04-09)
- **DatePicker toISOString() timezone bug** — `date.toISOString().split('T')[0]` shifts date by -1 day in CEST (UTC+2). April 10 00:00 CEST = April 9 22:00 UTC → API receives wrong date. Fix: use `getFullYear()/getMonth()/getDate()` for local date formatting. Affects any DatePicker/Calendar component storing dates as YYYY-MM-DD strings. (2026-04-09, AAA-T-175)

## Domain Concepts

- **Plausible Analytics** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. No cookies = no RODO. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`. S3 public GET; CORS must allow PUT from CMS domains. (2026-03-18)
- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953. (2026-03-23)
- **deleteAppointment does NOT remove Google Calendar event** — DB row deleted only. Notion ticket created. (2026-03-28)
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`). (2026-03-27)
- **notification_email is per survey_link, not per tenant** — Each link has own notification address. (2026-03-27)
- **RLS for anon can only filter by row properties** — is_published, UUID token, etc. Cannot filter by session context (tenant_id) because anon has no JWT. Tenant filtering must be app-level (server component). (2026-03-31)
- **Booking flow is in apps/website/features/calendar/booking.ts** — NOT calendar/actions.ts as assumed. Trigger integration point for booking_confirmed. (2026-04-01, AAA-T-152)
- **n8n HTTP Request: specifyBody "string" + JSON.stringify()** — Reliable way to send nested objects in n8n HTTP Request node. bodyParameters can't handle nested payload objects. (2026-04-01, AAA-T-152)
- **Condition evaluator supported operators** — >=, <=, !=, ==, >, <, contains, in. NO single `=` operator. Field names without `{{ }}` wrappers. (2026-04-01, AAA-T-152)
- **OLX/Allegro API quirks** — OLX: offset pagination, credentials in POST body. Allegro: cursor pagination, Basic auth for token exchange, `publication.status: 'END'` for removeListing (PATCH not DELETE). (2026-04-02)
- **Consent question type = string "true" stored in DB** — `question_type: 'consent'`, renders as checkbox, stores string `"true"` (not boolean) in survey_answers.answer TEXT column. Always required (is_required forced true, toggle disabled in builder). (2026-04-02)
- **Cookie banner wording: general "analytics" not "Plausible"** — Cookie/analytics consent banner uses general wording ("anonimowe dane analityczne") without naming specific tool. Avoids updating banner when analytics provider changes. (2026-04-02)
- **surveys.status DB column is vestigial** — Status should be computed from survey_links (has active links = active, no links = draft, all expired = closed). Manual enum management on surveys table is wrong model. User wants computed status, not stored status. (2026-04-02)
- **RPC function parameter names must match migration SQL exactly** — n8n called `upsert_marketplace_connection` with `p_connection_id` but function expected `p_tenant_id`. PostgreSQL error at runtime. Created dedicated `update_marketplace_tokens(p_connection_id)` for token refresh use case. (2026-04-03, AAA-T-157)
- **Baikal CalDAV has 2 calendars** — tsdav auto-discovery finds "Appointments" (`/dav.php/calendars/haloefekt/appointments/`) and "Default calendar" (`/dav.php/calendars/haloefekt/default/`). Must filter or let user select which calendar to use. (2026-04-09)
- **Success page "What's Next" steps are Halo Efekt-specific** — Hardcoded timeline (Analiza→Email→Kontakt) only applies to intake surveys. Per-survey confirmation templates needed for booking confirmations, other survey types. Notion task created for per-survey success page customization. (2026-04-09, AAA-T-175)

## Architecture Decisions

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency. (2026-03-27)
- **pgcrypto for API key encryption (aspirational, not implemented in email_configs)** — email_configs stores api_key as plain TEXT despite docs claiming encryption. No `email_configs_decrypted` view exists. Marketplace integration (AAA-T-157) is the first actual pgcrypto usage in codebase (BYTEA columns + decrypted view + `app.encryption_key` GUC). (2026-03-27, corrected 2026-04-02)
- **Cross-project update rule** — When AAA-P-9 tasks affect core CMS, update BOTH PROJECT_SPECs. (2026-03-30)
- **trigger-schemas.ts in lib/ (not features/)** — Cross-feature variable registry shared between email and workflow features. lib/ is correct for shared infrastructure. features/email imports from lib/trigger-schemas.ts. (2026-03-31)
- **VariableInserterPopover in packages/ui/** — Shared component with local VariableItem interface (avoids packages→apps import boundary violation). Structurally compatible with TriggerVariable from apps/cms/. (2026-03-31)
- **Hybrid variable architecture: registry + JSONB cache** — trigger-schemas.ts is source of truth (TypeScript). template_variables JSONB is lazy cache written on save for n8n (which can't call TypeScript). CMS always reads from registry, writes snapshot to DB. (2026-03-31)
- **form_confirmation as registry key** — Standalone templates (form_confirmation) are just another entry in TRIGGER_VARIABLE_SCHEMAS. No special case, same variable system for workflow and non-workflow templates. (2026-03-31)
- **300ms debounced onChange for config panels** — Real-time canvas feedback without Apply button. Explicit Save persists to DB. triggerType passed in ConfigPanelProps for variable inserter context. (2026-03-31)
- **TENANT_ID as server-only env var for shop frontends** — No NEXT_PUBLIC_ prefix, prevents client-side leakage of tenant context. Shop is per-tenant: env var filters products/categories. (2026-03-31)
- **True anon Supabase client for shop frontend** — Uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not service_role like website). RLS enforces is_published for products. (2026-03-31)
- **shop_categories RLS USING(true) is correct** — Anon has no JWT/tenant context, so tenant_id filter must be app-level (server component). Categories contain non-sensitive data. (2026-03-31)
- **Delay step nie dispatchuje do n8n — CMS pisze resume_at bezpośrednio do DB** — n8n nie "trzyma" kroków przez godziny/dni. Wzorzec: handleDelay zapisuje resume_at + status='waiting', n8n cron co 5 min wywołuje /api/workflows/process-due-delays. (2026-04-01, AAA-T-150)
- **n8n Delay Processor: POST do CMS, nie bezpośrednio do Supabase** — Nawet gdy n8n ma Supabase credentials (ma, bo form_confirmation je używa), logika orkiestracji (który krok wznowić) należy do CMS, nie n8n. n8n = głupi timer. (2026-04-01, AAA-T-150)
- **Atomic claim z FOR UPDATE SKIP LOCKED dla batch processing** — Supabase JS chain nie jest atomowy. Dla batch endpoint gdzie concurrent calls mogą się nałożyć: PostgreSQL RPC z FOR UPDATE SKIP LOCKED + status przejściowy 'processing'. (2026-04-01, AAA-T-150)
- **HOST_URL env var reused for website→CMS communication** — Website .env.local HOST_URL points to CMS (localhost:3001 dev, cms.haloefekt.pl prod). Path /api/workflows/trigger appended in code. Reuses CMS's existing HOST_URL convention. (2026-04-01, AAA-T-152)
- **No separate API route per trigger type** — n8n calls existing /api/workflows/trigger with trigger_type in payload (e.g., 'lead_scored'). No /api/workflows/trigger/lead-scored/ needed. Single endpoint, multiple trigger types. (2026-04-01, AAA-T-152)
- **Old n8n email webhook removal deferred** — survey_submitted now fires workflow engine trigger in parallel with old N8N_WEBHOOK_FORM_CONFIRM_EMAIL_URL. Removing old webhook is destructive; deferred until tenant has active workflow with send_email step confirmed working. (2026-04-01, AAA-T-152)
- **In-code JSON constants for workflow templates (copy-on-use)** — Templates stored as TypeScript constants in `features/workflows/templates/workflow-templates.ts`. On "Use template", server action materialises real workflow+steps+edges with fresh UUIDs. Zero DB overhead for non-users. Same pattern as n8n/Make.com. (2026-04-01, AAA-T-153)
- **Trigger as real workflow_step in templates** — Including trigger_type step in template step arrays allows fully-connected canvas on load (trigger→condition edge stored in DB). Executor safely skips trigger steps (no handler → logs warning, marks completed). (2026-04-01, AAA-T-153)
- **MAX_STEPS = 50 + 5-min sync step timeout in executor** — DEFAULT_EXECUTION_LIMITS in engine/types.ts. Timeout applies only to sync steps (condition, webhook). Async steps timeout in n8n. (2026-04-01, AAA-T-153)
- **Standalone n8n workflows for marketplace (not workflow engine)** — Marketplace sync is infrastructure/system-level. Workflow engine = user-configurable event flows. Marketplace = background cron ops. (2026-04-02)
- **Multi-provider calendar architecture** — calendar_connections table with pgcrypto encryption, CalendarProvider interface with ResultAsync, survey_links.calendar_connection_id for calendar-per-survey model. CalDAV via tsdav (tested with Baikal: Basic auth, DAVClient). (2026-04-09)
- **app_config table replaces custom GUC for encryption key** — Supabase Cloud AND local both block `ALTER DATABASE SET` for custom `app.*` parameters. Solution: `app_config` table with `get_encryption_key()` SECURITY DEFINER helper. Seed row has placeholder, production UPDATE after deploy. Replaces GUC COALESCE fallback pattern. (2026-04-09)
- **SurveyLinkCalendarSelect dual mode (auto-save vs controlled)** — Component needed two modes: standalone (saves immediately on change via server action) and embedded in form (tracks state, parent form saves). Discriminated union props pattern: `{ mode: 'standalone'; surveyLinkId: string }` vs `{ mode: 'controlled'; value: string | null; onChange: (id) => void }`. Reusable pattern for any component that appears both standalone and inside forms. (2026-04-09, AAA-T-175)
- **Extract pure logic from .tsx to utils/ for TDD** — When component files contain pure logic (validation, transformation, mapping), extract to `utils/` files. Enables unit testing without React rendering. Pattern: `.tsx` = rendering + hooks, `utils/*.ts` = pure testable functions. (2026-04-10, AAA-T-177)
- **React Compiler enabled via `reactCompiler: true` in all 4 next.config.ts** — Explicitly enabled in cms, website, jacek, kolega after upgrading to Next.js 16.2.3 + React 19.2.5 (2026-04-10). Auto-memoizes — Boy Scout Rule: remove manual useCallback/useMemo when touching files (unless profiling shows need). Don't wrap new handlers in useCallback by default. (2026-04-10)
- **3-pass validation more valuable than unit tests for UI-heavy features** — For features that are primarily UI (canvas interactions, drag-and-drop, visual builders), the 3-pass validator (functional + architecture + integration) catches more real issues than unit tests. Unit tests still valuable for extracted pure logic in utils/. (2026-04-10, AAA-T-177)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — Flexibility to partially complete and pause. (2026-03-23)
- **/develop command: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merge to main. (2026-03-26)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter. (2026-03-28)
- **Cross-project task organization** — Infrastructure tasks live where their "home" is (AAA-P-4), not consuming project. (2026-03-29)
- **Multi-field detail panel = RHF form + Save button, NOT pencil-per-field inline editing** — User rejected pencil icon per field for detail panels with multiple fields. Always-visible form with Save button preferred. Inline editing still correct for single-field cases (e.g., workflow name on list page). The distinction: multi-field panel = form, single-field list item = inline. (2026-04-08)
- **Combobox with inline create** — Create related entities without leaving current editor. Popover+Command pattern. (2026-03-30)
- **Variable inserter button needs text label** — Ghost button with "Zmienne" text, not icon-only Braces. (2026-03-31)
- **Horizontal flow (left-to-right) for workflow canvas** — Position.Left→Right, not top/bottom. (2026-03-31)
- **Trigger creation in canvas, not dialog** — Dialog = name+description only. Trigger type on canvas. (2026-03-31)
- **VariableInserter reuse in all expression/email fields** — Wherever trigger context variables available. (2026-03-31)
- **"impl i validacje rob auto, zatrzymaj sie przy testach"** — Auto mode through implementation + validation phases, stop at manual testing phase. (2026-04-01, AAA-T-153)
- **Gallery (grid) as default view, stacked cards (image-top, text-below)** — list is secondary. Horizontal cards rejected. (2026-04-01)
- **Light theme for Oleg's shop** — Warm linen off-white, not pure white. (2026-04-02)
- **Sidebar filters for e-commerce shops** — 240px sidebar category filter, not horizontal pill bar. (2026-04-02)
- **Prominent is_featured toggle** — Card with Star icon + Switch + amber accent border, not simple checkbox. (2026-04-02)
- **Self-reflection iteration in auto mode** — Orchestrator asks itself clarifying questions even in auto mode. (2026-04-02)
- **Consent question always required (is_required forced)** — Legal obligation. SurveyBuilder forces is_required=true for consent type. (2026-04-02)
- **Landing page section spacing: golden ratio py-24 base** — py-24 (96px) base, scaled with phi 1.618 for hero/CTA. (2026-04-02)
- **User workflow: docx design notes -> extract -> design agent** — New input channel for design feedback. (2026-04-02)
- **InsertMediaModal: link input above filters, not below** — User corrected layout order: URL link input must appear between upload zone and filter bar, not after filters. middleSlot prop pattern for injecting content into LibraryTab. (2026-04-02)
- **Native input type="date" rejected — always use shadcn/ui DatePicker** — User rejected native HTML date input. Always use shadcn/ui DatePicker (Popover + Calendar component) for consistent styling and UX. (2026-04-08)
- **Always test with local database** — CMS was pointing to production Supabase while testing migrations that only existed locally, wasting debugging time. Always use `supabase start` and local connection for development/testing. (2026-04-09)
- **Always design bidirectional state transitions** — Deactivate button existed but no Activate button to re-enable. When adding a disable/deactivate action, always implement the reverse action too. (2026-04-09)
- **Always use `vitest watch` during TDD, not `vitest run`** — User explicitly corrected: watch mode for interactive development, run mode only for CI. (2026-04-09)
- **Replace old UI component when new one covers its functionality** — User wanted AddNodeDropdown removed entirely after StepLibraryPanel was built (same add-step capability). Don't keep redundant UI paths. (2026-04-10, AAA-T-177)
- **Collapsible panels: close button inside the panel itself** — User expects panels (config, step library) to have their own close/X button, not only external toggle. (2026-04-10, AAA-T-177)
