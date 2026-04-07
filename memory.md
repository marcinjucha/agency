# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-04-02)

**Status:** Iterations 1-8 done + kolega done. Remaining: iteration 9 (feature flags, Core CMS blocker) + iteration 10 (polish/deploy).
**Scope:** Two shops: Jacek (books, dark amber theme) + Kolega (general merchandise, light linen theme). Catalog-only, NO Stripe. Single Supabase (`shop_` prefix), CMS extended, separate frontends (`apps/shop/jacek/`, `apps/shop/kolega/`).
**Key decisions:** `listing_type` ENUM, `gallery`/`editorial` display_layout, `is_featured BOOLEAN`, flat categories. Dual PROJECT_SPEC: `docs/PROJECT_SPEC.yaml` (AAA-P-4) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9).

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

**Status:** Complete. 6 iterations. requireAuth() helper consolidated across 18 files.
**Scope:** Permission system with type-safe PermissionKey, is_super_admin boolean, role-permission mapping.
**Key decisions:** `as const` satisfies Record → derived PermissionKey union (compile-time safety). is_super_admin as boolean (not role) — validated by analyst-agent. requireAuth() replaced 48 inline auth checks (-123 LOC).

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

## Bugs Found (project-specific patterns)

- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. Also: `db:types` uses --local, need --linked when local not running. (2026-03-28)
- **Supabase JS v2.95.2 `as any` needed even for SELECT** — `.from('shop_products')` resolves to `never` in complex chains. Upgrade may fix. (2026-03-30)
- **Race condition on concurrent n8n callbacks** — Fix: optimistic lock + idempotency guard on callback route. (2026-03-31, AAA-T-149)
- **SSRF in webhook handler** — User-configured webhook URLs could target private IPs. Fix: private IP blocklist + AbortSignal.timeout(10_000). (2026-03-31, AAA-T-149)
- **{{variable}} syntax in condition evaluator causes silent false** — Mustache syntax `{{fieldName}}` always evaluates to false. Fix: resolveField() strips `{{ }}` wrapper. (2026-04-01, AAA-T-152)
- **ConditionNode handle ID mismatch** — `id="yes"`/`id="no"` handles vs executor `'true'`/`'false'`. ReactFlow silently drops edges. Fix: use `id="true"`/`id="false"`. (2026-04-01, AAA-T-153)
- **Template trigger node synthetic (UUID lost on remount)** — Synthetic trigger UUID changes each mount → edges can't persist. Fix: add trigger as real workflow_step in templates. (2026-04-01, AAA-T-153)
- **Type/DB column name mismatch in manually written types** — Always cross-reference migration SQL when writing manual types. 3 mismatch types: phantom columns, wrong names, missing columns. (2026-04-02, AAA-T-157)
- **Survey email validation ignored `semantic_role`** — Question had `type: 'text'` in DB but `semantic_role: 'client_email'`. Validation schema only checked `question.type`, so email field got text validation (no format check). Multiple RHF fixes (useFormState, Controller, mode changes) were red herrings. Root cause only found via `[DEBUG]` visible line in component revealing the actual data. Fix: `effectiveType` pattern where `semantic_role` overrides `question.type` for both validation and input rendering. (2026-04-02)
- **RHF `register` swallows per-field errors silently** — QuestionField inputs using `register` didn't surface `fieldState.error` from react-hook-form. Migrated all inputs to `Controller` with `fieldState.error` for consistent error display. (2026-04-02)
- **Users table had no INSERT/DELETE RLS policy** — First time users created from CMS (RBAC). SELECT/UPDATE existed, INSERT/DELETE missing. Silent failure on user creation. (2026-04-06, AAA-T-76)
- **triggerAiAnalysis had zero auth check** — Server Action callable by any authenticated user without permission verification. Discovered during RBAC audit. (2026-04-06, AAA-T-76)
- **fromSafePromise(Promise.reject()) misuse** — `fromSafePromise` expects a promise that never rejects (wraps resolution). Using it with `Promise.reject()` causes unhandled rejection. Use `ResultAsync.fromPromise()` instead for potentially-rejecting promises. (2026-04-06)
- **Permission denial returned inside ok() path** — Server Action returned `ok({ error: 'Forbidden' })` instead of `err(...)`. Caller checked `.isOk()` and proceeded with forbidden response as "success". Always use `err()` for denial. (2026-04-06)
- **React hooks ordering violation in permission-gated components** — Early return before hooks (e.g., `if (!hasPermission) return null` before `useState`) violates Rules of Hooks. Fix: move permission check after all hooks, or use conditional rendering wrapper. (2026-04-06)
- **PermissionPicker child filtering showed all permissions** — `expandPermissionKeys` was called with parent keys but returned only parent keys (no expansion). Child permissions never rendered in UI. Root cause: expand function needed to map parent→children from ROLE_PERMISSIONS structure. (2026-04-07)
- **Vitest Proxy mock + async importOriginal = infinite hang** — `vi.mock('module', async (importOriginal) => { const orig = await importOriginal(); return { ...orig, fn: vi.fn() } })` hangs indefinitely in vitest. WHY: Proxy-based mock intercepts the import causing circular resolution. Fix: don't spread importOriginal for modules with pure functions — mock only what you need, or don't mock at all if functions are pure. (2026-04-07)
- **TanStack Query cache not cleared on logout** — `queryClient` persists across sessions. User A logs out, User B logs in → sees User A's cached data (roles, permissions). Fix: `queryClient.clear()` in signOut action. (2026-04-07)
- **Don't globally mock pure utility modules in tests** — `@/lib/permissions` (expandPermissionKeys, hasPermission) are pure functions with no side effects. Globally mocking them defeats the purpose of testing. Mock only impure dependencies (Supabase, auth). (2026-04-07)

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

## Architecture Decisions

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency. (2026-03-27)
- **pgcrypto for API key encryption (aspirational, not implemented in email_configs)** — email_configs stores api_key as plain TEXT despite docs claiming encryption. No `email_configs_decrypted` view exists. Marketplace integration (AAA-T-157) is the first actual pgcrypto usage in codebase (BYTEA columns + decrypted view + `app.encryption_key` GUC). (2026-03-27, corrected 2026-04-02)
- **Cross-project update rule** — When AAA-P-9 tasks affect core CMS, update BOTH PROJECT_SPECs. (2026-03-30)
- **trigger-schemas.ts in lib/ (not features/)** — Cross-feature variable registry shared between email and workflow features. lib/ is correct for shared infrastructure. features/email imports from lib/trigger-schemas.ts. (2026-03-31)
- **VariableInserterPopover in packages/ui/** — Shared component with local VariableItem interface (avoids packages→apps import boundary violation). Structurally compatible with TriggerVariable from apps/cms/. (2026-03-31)
- **Hybrid variable architecture: registry + JSONB cache** — trigger-schemas.ts is source of truth (TypeScript). template_variables JSONB is lazy cache written on save for n8n (which can't call TypeScript). CMS always reads from registry, writes snapshot to DB. (2026-03-31)
- **form_confirmation as registry key** — Standalone templates (form_confirmation) are just another entry in TRIGGER_VARIABLE_SCHEMAS. No special case, same variable system for workflow and non-workflow templates. (2026-03-31)
- **NODE_TYPE_REGISTRY centralized** — node-styles.ts + WorkflowCanvas nodeTypes + AddNodeDropdown ITEMS were scattered. Centralized into node-registry.ts: NODE_TYPE_CONFIGS (config-only, safe outside dynamic boundary) and NODE_COMPONENTS (inside boundary). Adding new node type = 2 files. (2026-03-31)
- **PANEL_REGISTRY for config panels** — Maps stepType → React component, mirrors NODE_TYPE_CONFIGS. Adding new config panel = new file + registry entry. (2026-03-31) [Pattern: ag-coding-practices "Naturally Extensible Systems"; boundary rules: ag-architecture "Dynamic Import Boundary"]
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
- **Marketplace adapter pattern** — `features/shop-marketplace/adapters/`, feature-local (not package). MARKETPLACE_REGISTRY pattern. New marketplace = new file + registry entry. (2026-04-02)
- **Standalone n8n workflows for marketplace (not workflow engine)** — Marketplace sync is infrastructure/system-level. Workflow engine = user-configurable event flows. Marketplace = background cron ops. (2026-04-02)
- **pgcrypto BYTEA for OAuth tokens** — `pgp_sym_encrypt` returns BYTEA natively. SECURITY DEFINER function `upsert_marketplace_connection()` needed because Supabase JS can't call pgp_sym_encrypt directly. `app.encryption_key` GUC = passphrase. First real pgcrypto usage in codebase. (2026-04-02)
- **FeedbackBanner instead of toast for OAuth callback** — No toast library in project. Inline dismissible alert reads URL query params (?connected=, ?error=), cleaned via router.replace. (2026-04-02, AAA-T-157)
- **connectMarketplace returns authUrl for client redirect** — Server Actions can't redirect to external URLs. Returns { authUrl }, client does window.location redirect. (2026-04-02, AAA-T-157)
- **jose for JWT state (not jsonwebtoken)** — jose is Edge-compatible. State JWT = { tenantId, marketplace, nonce }, 10min expiry, HS256. (2026-04-02, AAA-T-157)
- **`semantic_role` overrides `question.type` via `effectiveType`/`inputType` pattern** — Survey questions have both `type` (DB storage type: text/number/date) and `semantic_role` (business meaning: client_email/client_name/client_phone). When `semantic_role` implies a specific type, it overrides `question.type` for validation schema generation and input rendering. (2026-04-02)
- **`packages/database` has known deferred violations** — BLOCK_TYPE_LABELS and DEFAULT_BLOCKS in packages/database are pre-existing architecture violations (business constants in infrastructure package). Known deferred items — don't re-flag in audits. (2026-04-03)
- **remeda + neverthrow as project FP stack** — remeda for data pipelines (pipe, map, filter, etc.), neverthrow for typed error handling (Result, ResultAsync). Effect.js explicitly rejected — too heavy for Next.js CRUD app. (2026-04-06)
- **result-helpers.ts shared infrastructure in lib/** — `authResult()`, `zodParse()`, `fromSupabase()` wrappers that convert auth/validation/DB calls into neverthrow Results. Located in `apps/cms/lib/result-helpers.ts`. (2026-04-06)
- **Type-safe PermissionKey via `as const satisfies Record`** — ROLE_PERMISSIONS defined with `as const satisfies Record<Role, PermissionKey[]>`, then `PermissionKey = typeof ROLE_PERMISSIONS[Role][number]`. Compile-time validation + derived union type. No separate enum to maintain. (2026-04-06)
- **is_super_admin as boolean, not role** — Super admin bypasses all permission checks. Implemented as boolean column on users table, not as a role in role-permission mapping. WHY: super admin is orthogonal to roles (a user can have any role AND be super admin). Validated by analyst-agent. (2026-04-06)
- **requireAuth() helper consolidation pattern** — Single `requireAuth(permissionKey?)` replaces inline `createClient → getUser → check` in 48 Server Actions across 18 files. Returns `Result<AuthContext, AppError>`. Optional permission param for granular checks. (2026-04-06)
- **expandPermissionKeys extracted to lib/permissions.ts** — Shared permission expansion logic (parent key → child keys) used by both PermissionPicker component and test utilities. Single source of truth for permission hierarchy traversal. (2026-04-07)
- **DISPLAY_GROUPS for visual-only permission grouping** — PermissionPicker needed 4 visual groups (Users, Content, Settings, System) but PERMISSION_GROUPS (backend) has different structure. Separate DISPLAY_GROUPS constant for UI rendering without touching authorization logic. (2026-04-07)
- **Vitest setup for CMS app** — `vitest.config.ts` in `apps/cms/`, path aliases matching tsconfig (`@/` → `./`), `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`. Test files colocated in `__tests__/` dirs next to source. (2026-04-07)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — Flexibility to partially complete and pause. (2026-03-23)
- **/develop command: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merge to main. (2026-03-26)
- **JIRA-style split view over Sheet overlay** — Inline 480px panel on xl+, full page on smaller screens. (2026-03-28)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter. (2026-03-28)
- **Cross-project task organization** — Infrastructure tasks live where their "home" is (AAA-P-4), not consuming project. (2026-03-29)
- **Inline editing over Dialog for simple CRUD** — In-place editing for simple entities. Dialog = overkill for 4 fields. (2026-03-30)
- **Combobox with inline create** — Create related entities without leaving current editor. Popover+Command pattern. (2026-03-30)
- **Variable inserter button needs text label** — Ghost button with "Zmienne" text, not icon-only Braces. (2026-03-31)
- **Horizontal flow (left-to-right) for workflow canvas** — Position.Left→Right, not top/bottom. (2026-03-31)
- **Row click navigates directly to canvas editor** — No intermediate detail page. (2026-03-31)
- **Gallery/card view for workflows** — Card grid + table list toggle, persists to localStorage. (2026-03-31)
- **Trigger creation in canvas, not dialog** — Dialog = name+description only. Trigger type on canvas. (2026-03-31)
- **560px config panel width** — 480px too tight for form-heavy panels. (2026-03-31)
- **VariableInserter reuse in all expression/email fields** — Wherever trigger context variables available. (2026-03-31)
- **Config panel registry = extensible pattern** — New step type = new file + registry entry. (2026-03-31)
- **Shop frontend path: apps/shop/jacek/** — Nested under apps/shop/ parent, not flat apps/shop-jacek/. User's father's shop name. (2026-03-31)
- **Inline workflow name editing on list page** — User wants inline editing of workflow names directly on the workflow list page. Next task after AAA-T-151 merge. (2026-04-01)
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
- **Readability: named functions over inline closures** — User's strongest signal during FP adoption. Extract `.map(fn)` callbacks to named functions. File organization: public API → internal helpers → private functions. (2026-04-06)
- **Boy Scout Rule for FP migration (not big-bang refactor)** — Adopt remeda + neverthrow incrementally: refactor files when you touch them, don't rewrite existing working code in bulk. (2026-04-06)
- **True incremental TDD, not batch TDD** — First version of TDD in ag-develop had "write all tests first, then implement" — user corrected to true Red-Green-Refactor: one test at a time (write failing test → make it pass → refactor → next test). Batch test-writing is waterfall disguised as TDD. Updated ag-develop command + ag-dev-workflow + ag-validation-patterns skills. (2026-04-07)
- **Page Object Pattern for component tests** — Wrap render + queries in helper object (e.g., `renderPermissionPicker()` returns `{ getCheckbox, getGroup, clickCheckbox }`). Keeps tests readable, DRY, decoupled from DOM structure. (2026-04-07)
- **`vitest --watch` over `vitest run` during TDD** — Faster feedback loop. Run watch mode in background, iterate on test+implementation. (2026-04-07)
- **`await queryClient.invalidateQueries()` in onSuccess** — `invalidateQueries` returns a Promise; fire-and-forget causes stale cache on navigation when `staleTime` is long (e.g., 5min). Fast navigation after mutation reads old cached data because invalidation hasn't completed. Always `await` it. (2026-04-07)
