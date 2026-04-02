# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-04-02)

**Status:** Iterations 1-8 done + kolega shop done. Jacek (tata) iterations 7+8 done (product catalog + homepage + SEO). Kolega (Oleg) complete frontend done (2026-04-02). Remaining: iteration 9 (feature flags, Core CMS blocker) + iteration 10 (polish/deploy).
**Scope:** E-commerce: Jacek (user's father, books) AND Kolega (Oleg, user's friend, general merchandise — furniture, electronics). Catalog-only with external links (NO Stripe). Single Supabase, CMS extended (`features/shop-*`), separate frontends under `apps/shop/jacek/` and `apps/shop/kolega/`.
**Key decisions:** `shop_` prefixed tables, `listing_type` PostgreSQL ENUM, `gallery`/`editorial` display_layout, `NUMERIC(10,2)` for price, `TEXT[]` for tags, flat categories. `is_featured BOOLEAN` on shop_products (2026-04-02) for homepage featured products.
**Jacek (tata):** Dark + warm amber ("library at night"), Merriweather serif + Geist Sans, editorial layout for books, minimal 3-link nav, port 3002. Zolix for paid books, S3 for free materials.
**Kolega (Oleg):** Light warm linen (`hsl(40 30% 97%)`), steel blue primary (`hsl(215 45% 42%)`), Inter only (no serif), sidebar category filters (240px, server component), featured products section, `aspect-[4/5]` product cards with hover shadow, `max-w-7xl`, port 3003.
**CMS is_featured toggle:** Prominent card with Star icon + Switch in ProductSettingsSidebar. Amber accent border.
**Dual PROJECT_SPEC:** `docs/PROJECT_SPEC.yaml` (AAA-P-4) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9).

## Workflow Engine — AAA-P-4 — IN PROGRESS (2026-03-31)

**Status:** Iterations 1-9 done. Iter 9 (Booking + Lead Score Triggers, AAA-T-152, 2026-04-01): survey_submitted trigger wired in submit.ts, booking_confirmed trigger in booking.ts, lead_scored trigger from n8n via existing /api/workflows/trigger. Next: iteration 10. Extends Core CMS (AAA-P-4). 11 Notion tasks with "Workflow:" prefix.
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

## Marketplace Integration — AAA-P-9 — IN PROGRESS (2026-04-02)

**Status:** Iterations 1-4 done (DB schema migration, CMS foundation: types/queries/validation/actions + adapter interface/registry, OAuth flow, OLX + Allegro adapter implementations). AAA-T-157 repurposed from investigation to full XL feature (10 iterations, High priority).
**Scope:** OLX + Allegro integration — publish products, sync status (sold/expired), import existing listings. Bidirectional sync.
**DB tables:** shop_marketplace_connections (OAuth creds per tenant) + shop_marketplace_listings (1 product → N listings, marketplace_params JSONB) + shop_marketplace_imports. TEXT for marketplace type (not ENUM, same reasoning as trigger_type/step_type).
**Key decisions:** MarketplaceAdapter interface in `features/shop-marketplace/adapters/` (feature-local, not package). MARKETPLACE_REGISTRY pattern (like NODE_TYPE_REGISTRY). Per-tenant pgcrypto-encrypted OAuth tokens (same as email_configs). OLX location data on listings only (marketplace_params JSONB), not on shop_products.
**n8n strategy:** Standalone n8n workflows (cron polling, token refresh) — NOT workflow engine. Marketplace sync = system infrastructure, not user-configurable automation. CMS configures n8n marketplace access (not directly in n8n).
**UI:** Unified Marketplace CollapsibleCard in product editor — one card with overview (toggle + badge per platform) + per-platform collapsible sub-sections. NOT separate cards per marketplace.
**Future:** Auto-publish via workflow engine trigger (product.published → auto-publish to connected marketplaces).

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
- **claim_due_delay_steps() had updated_at which doesn't exist on table** — RPC function generated with `updated_at = now()` but workflow_step_executions has no updated_at column. Fix: remove from function. (2026-04-01, AAA-T-150)
- **Supabase JS .update().eq().lte().select() is NOT atomic** — Chained methods are separate HTTP request parts, not a single UPDATE...RETURNING SQL. Two concurrent callers can claim same rows. Fix: PostgreSQL RPC with FOR UPDATE SKIP LOCKED. (2026-04-01, AAA-T-150)
- **New status missing from CHECK constraint on remote DB** — 'processing' added in migration but migration only pushed to local. RPC UPDATE failed with CHECK violation. Fix: apply ALTER TABLE directly via supabase db query --linked. (2026-04-01, AAA-T-150)
- **PostgREST .order() cannot sort by foreign table columns** — `.order('workflow_steps(sort_order)')` fails silently. Fix: sort client-side after `.map()`. (2026-04-01, AAA-T-151)
- **workflow_steps has NO sort_order column** — Analyst assumed it existed. Actual order determined by `created_at`. Always verify column existence before coding. (2026-04-01, AAA-T-151)
- **Supabase error objects are NOT Error instances** — `String(supabaseError)` returns "[object Object]". Fix: `(error as any)?.message ?? fallback`. (2026-04-01, AAA-T-151)
- **`import { cn } from '@agency/ui/lib/utils'` wrong path** — Must be `import { cn } from '@agency/ui'`. Recurring across new components. (2026-04-01, AAA-T-151)
- **{{variable}} syntax in condition evaluator causes silent false** — Condition expressions with `{{fieldName}}` (mustache syntax copied from email template fields) always evaluated to false. Fix: resolveField() strips `{{ }}` wrapper. Both `fieldName` and `{{fieldName}}` now work. (2026-04-01, AAA-T-152)
- **score vs overallScore mapping mismatch in lead_scored trigger** — TriggerPayloadLeadScored has field `score` but buildTriggerContext maps it to `overallScore` in variable context. expressionHint in trigger-schemas.ts must reference `overallScore`, not `score` or `lead_score`. (2026-04-01, AAA-T-152)
- **Turbopack barrel re-export in features/workflows/types.ts** — Same Turbopack bug (dev-only, not build). New location: features/workflows/types.ts. Pre-existing, unrelated to task. Production build passes clean. (2026-04-01, AAA-T-152)
- **ConditionNode handle ID mismatch** — ConditionNode source handles used `id="yes"`/`id="no"` but executor + templates use `'true'`/`'false'` for condition_branch. ReactFlow silently drops edges when sourceHandle doesn't match. Fix: handles changed to `id="true"`/`id="false"`. (2026-04-01, AAA-T-153)
- **Template trigger node was synthetic (UUID lost on remount)** — Templates had no trigger step in workflow_steps. Trigger created as synthetic node with `crypto.randomUUID()` on every mount — UUIDs change, so edges referencing trigger can't persist in DB. Fix: add trigger as real workflow_step in templates. (2026-04-01, AAA-T-153)
- **WORKFLOW_CALLBACK_URL was duplicate of HOST_URL** — action-handlers.ts used separate env var but HOST_URL already points to CMS base. Removed WORKFLOW_CALLBACK_URL, use HOST_URL instead. (2026-04-01, AAA-T-153)
- **`max-w-[Npx]` on grid cards creates gaps** — grid cells are wider than the card. Fix: remove `max-w` from cards, control size via grid column count instead. (2026-04-01, AAA-T-159)
- **EmailTemplateList is a server component — cannot add useState** — Adding client-side state (e.g., view toggle) requires extracting a client wrapper component. Direct useState in server component causes build error. (2026-04-01, AAA-T-159)
- **useSearchParams requires Suspense boundary in Next.js 15+** — Build fails without `<Suspense>` wrapper around client components using useSearchParams. Pattern: route page.tsx wraps client component in Suspense with LoadingState fallback. (2026-04-02, AAA-T-157)
- **EmptyState redundant with fixed-set configuration pages** — Card grid showing all options (connected/not-connected) already communicates state. EmptyState on top is redundant for fixed-option pages (vs dynamic lists where empty = nothing to show). (2026-04-02, AAA-T-157)
- **Decrypted view bypasses RLS without security_invoker** — PostgreSQL views execute as view owner (postgres) by default, bypassing RLS on base table. Fix: `WITH (security_invoker = true)` on PostgreSQL 17+ (Supabase). Critical for multi-tenant security. (2026-04-02, AAA-T-157)
- **Type/DB column name mismatch in manually written types** — When DB types aren't generated, manually written TypeScript types had 3 critical mismatches: phantom columns (sync_status/sync_error on wrong table), wrong column names (total_count vs total_items), missing columns (marketplace on imports). Fix: always cross-reference migration SQL when writing manual types. (2026-04-02, AAA-T-157)
- **updateSchema.partial() makes IDs optional** — Using `.partial()` on a schema with required UUID fields makes them optional, bypassing NOT NULL DB constraints. Fix: `.omit({ field: true }).partial()` to exclude non-updatable fields before partial. (2026-04-02, AAA-T-157)
- **VALID_MARKETPLACES duplicated MarketplaceId** — Hardcoded array in API route duplicated type union already defined in types.ts. Fix: derive from MARKETPLACE_LABELS keys (single source of truth). Same pattern as Label duplication bug. (2026-04-02, AAA-T-157)

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
- **ConditionNode handle IDs must match executor condition_branch values** — Visual "Tak"/"Nie" labels are display-only. ReactFlow Handle `id` props must be `"true"`/`"false"` to match condition evaluator returns, edge condition_branch in DB, and executor branching logic. (2026-04-01, AAA-T-153)
- **Synthetic trigger node pattern** — When workflow has no trigger step in workflow_steps, WorkflowEditor adds synthetic node with random UUID per mount. After first Save, trigger becomes real step. Templates bypass this by including trigger as real step from creation. (2026-04-01, AAA-T-153)
- **OLX.pl API** — developer.olx.pl, OAuth 2.0, manual verification required (delays possible), CRUD listings/photos/categories/locations. Free to use. (2026-04-02)
- **Allegro REST API** — developer.allegro.pl, OAuth 2.0 + JWT, sandbox available, POST-only token endpoint (since Aug 2025). ADVERTISEMENT format for classifieds. (2026-04-02)
- **Allegro removeListing uses PATCH not DELETE** — Allegro ends offers by setting `publication.status: 'END'`, not HTTP DELETE. (2026-04-02)
- **Allegro token exchange uses Basic auth** — base64(client_id:client_secret) in Authorization header, unlike OLX which sends credentials in POST body. (2026-04-02)
- **AAA-T-157 repurposed** — Originally "Sprawdzanie statusu produktu na Allegro/OLX" (Inbox, investigation). Expanded to full "Marketplace Integration (OLX + Allegro)" (To Do, High, XL, 10 iterations). (2026-04-02)

## Architecture Decisions

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency. (2026-03-27)
- **pgcrypto for API key encryption (aspirational, not implemented in email_configs)** — email_configs stores api_key as plain TEXT despite docs claiming encryption. No `email_configs_decrypted` view exists. Marketplace integration (AAA-T-157) is the first actual pgcrypto usage in codebase (BYTEA columns + decrypted view + `app.encryption_key` GUC). (2026-03-27, corrected 2026-04-02)
- **Cross-project update rule** — When AAA-P-9 tasks affect core CMS, update BOTH PROJECT_SPECs. (2026-03-30)
- **getMediaItems folder_id filter: undefined=all, null=root, string=folder** — Critical backward compat: default undefined returns ALL items. null ≠ default. (2026-03-30)
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
- **apps/shop/* workspace glob in root package.json** — apps/* doesn't match nested paths like apps/shop/jacek/. Need explicit apps/shop/* glob. (2026-03-31)
- **Delay step nie dispatchuje do n8n — CMS pisze resume_at bezpośrednio do DB** — n8n nie "trzyma" kroków przez godziny/dni. Wzorzec: handleDelay zapisuje resume_at + status='waiting', n8n cron co 5 min wywołuje /api/workflows/process-due-delays. (2026-04-01, AAA-T-150)
- **n8n Delay Processor: POST do CMS, nie bezpośrednio do Supabase** — Nawet gdy n8n ma Supabase credentials (ma, bo form_confirmation je używa), logika orkiestracji (który krok wznowić) należy do CMS, nie n8n. n8n = głupi timer. (2026-04-01, AAA-T-150)
- **Atomic claim z FOR UPDATE SKIP LOCKED dla batch processing** — Supabase JS chain nie jest atomowy. Dla batch endpoint gdzie concurrent calls mogą się nałożyć: PostgreSQL RPC z FOR UPDATE SKIP LOCKED + status przejściowy 'processing'. (2026-04-01, AAA-T-150)
- **Query key separation: executions.all() vs workflows.executions(workflowId)** — Separate TanStack Query key groups for global execution list vs per-workflow executions. Prevents invalidation cross-contamination. (2026-04-01, AAA-T-151)
- **formatDuration vs formatExecutionDuration** — Two intentionally different utils: formatDuration(seconds) for general use, formatExecutionDuration(startedAt, completedAt) for execution timeline display. (2026-04-01, AAA-T-151)
- **step_config delay: { value, unit } zamiast duration_minutes** — Ergonomiczne dla użytkownika ("2 dni" vs "2880 minut"). Konwersja na ms w momencie wykonania, nie w schemacie. (2026-04-01, AAA-T-150)
- **HOST_URL env var reused for website→CMS communication** — Website .env.local HOST_URL points to CMS (localhost:3001 dev, cms.haloefekt.pl prod). Path /api/workflows/trigger appended in code. Reuses CMS's existing HOST_URL convention. (2026-04-01, AAA-T-152)
- **No separate API route per trigger type** — n8n calls existing /api/workflows/trigger with trigger_type in payload (e.g., 'lead_scored'). No /api/workflows/trigger/lead-scored/ needed. Single endpoint, multiple trigger types. (2026-04-01, AAA-T-152)
- **Old n8n email webhook removal deferred** — survey_submitted now fires workflow engine trigger in parallel with old N8N_WEBHOOK_FORM_CONFIRM_EMAIL_URL. Removing old webhook is destructive; deferred until tenant has active workflow with send_email step confirmed working. (2026-04-01, AAA-T-152)
- **In-code JSON constants for workflow templates (copy-on-use)** — Templates stored as TypeScript constants in `features/workflows/templates/workflow-templates.ts`. On "Use template", server action materialises real workflow+steps+edges with fresh UUIDs. Zero DB overhead for non-users. Same pattern as n8n/Make.com. (2026-04-01, AAA-T-153)
- **Trigger as real workflow_step in templates** — Including trigger_type step in template step arrays allows fully-connected canvas on load (trigger→condition edge stored in DB). Executor safely skips trigger steps (no handler → logs warning, marks completed). (2026-04-01, AAA-T-153)
- **MAX_STEPS = 50 + 5-min sync step timeout in executor** — DEFAULT_EXECUTION_LIMITS in engine/types.ts. Timeout applies only to sync steps (condition, webhook). Async steps timeout in n8n. (2026-04-01, AAA-T-153)
- **`useViewMode(key, defaultMode)` hook in `apps/cms/hooks/use-view-mode.ts`** — shared localStorage-persisted view toggle. Uses `useState` initializer (not useEffect) to avoid flash-of-wrong-view. All CMS gallery toggles use this. (2026-04-01, AAA-T-159)
- **Unified gallery grid breakpoints: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`** — standard for all CMS list pages. 1col(<768px) / 2col(<1280px) / 3col(<1536px) / 4col(≥1536px). (2026-04-01, AAA-T-159)
- **Unified card style: `aspect-[16/7]` for image cards, `p-2.5`/`p-3` content padding, `line-clamp-2` titles, `hover:-translate-y-0.5` lift.** (2026-04-01, AAA-T-159)
- **Marketplace adapter pattern in features/shop-marketplace/adapters/** — MarketplaceAdapter interface, feature-local (not package). Same reasoning as workflow engine. New marketplace = new file + registry entry. (2026-04-02)
- **Standalone n8n workflows for marketplace (not workflow engine)** — Marketplace sync is infrastructure-level (cron polling, token refresh), not user-configurable automation. Workflow engine = tenant event-driven flows. Marketplace = system background ops. (2026-04-02)
- **Unified Marketplace CollapsibleCard in product editor** — One card with overview (toggle + badge per platform) + per-platform collapsible sub-sections. NOT separate cards per marketplace. MARKETPLACE_REGISTRY pattern. (2026-04-02)
- **Per-tenant marketplace OAuth via pgcrypto** — BYTEA columns for encrypted tokens (pgp_sym_encrypt returns bytea natively, no encode/decode roundtrip). Decrypted view with `security_invoker = true` for n8n. `app.encryption_key` PostgreSQL GUC for passphrase (set via ALTER DATABASE or Supabase Dashboard). First real pgcrypto usage in codebase. (2026-04-02)
- **OLX location data on listings only** — Platform-specific data stays on shop_marketplace_listings.marketplace_params JSONB, not polluting shop_products. (2026-04-02)
- **Stub Server Actions must include auth guard** — Stubs without getUserWithTenant() risk being copied without auth when implemented. All stubs now call getUserWithTenant() + isAuthError before returning stub error. (2026-04-02, AAA-T-157)
- **PostgreSQL function for encrypted token upsert** — Supabase JS .insert() can't call pgp_sym_encrypt. Created SECURITY DEFINER function `upsert_marketplace_connection()` with two code paths for NULL/non-NULL account_id. Callable via `.rpc()`. (2026-04-02, AAA-T-157)
- **jose for JWT state (not jsonwebtoken)** — jose is Edge-compatible, jsonwebtoken requires Node.js crypto. State JWT = { tenantId, marketplace, nonce }, 10min expiry, HS256. (2026-04-02, AAA-T-157)
- **connectMarketplace returns authUrl for client redirect** — Server Actions can't redirect to external URLs. Action returns { authUrl }, client does window.location redirect. (2026-04-02, AAA-T-157)
- **Service role client only in OAuth callback** — Initiation uses cookie-based server client (user must be logged in). Callback uses service role (no user session after external redirect back). (2026-04-02, AAA-T-157)
- **Standalone functions over this-binding in object literals** — Object literal methods using `this.otherMethod()` break when destructured. Fix: extract standalone functions, assign to adapter property. Applied to getListingStatuses->fetchOlxListingStatus pattern. (2026-04-02, AAA-T-157)
- **Shared HTTP wrapper (marketplaceFetch)** — All external marketplace API calls through one wrapper with AbortSignal.timeout(15s), response.ok check, MarketplaceApiError. No raw fetch in adapters. (2026-04-02, AAA-T-157)
- **Allegro sandbox toggle at module load** — ALLEGRO_SANDBOX env var evaluated at top-level const. All 3 URLs (auth, token, API) switch together. Fine for production, may confuse hot-reload in dev. (2026-04-02, AAA-T-157)
- **Credential access isolated to credentials.ts** — Single file with service role client, reads from decrypted view. Adapters never touch DB directly. (2026-04-02, AAA-T-157)
- **FeedbackBanner instead of toast for OAuth callback** — No toast library (sonner/react-hot-toast) in project. Used inline dismissible alert banner reading URL query params (?connected=, ?error=). URL cleaned via router.replace after reading. (2026-04-02, AAA-T-157)

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
- **Shop frontend path: apps/shop/jacek/** — Nested under apps/shop/ parent, not flat apps/shop-jacek/. User's father's shop name. (2026-03-31)
- **Inline workflow name editing on list page** — User wants inline editing of workflow names directly on the workflow list page. Next task after AAA-T-151 merge. (2026-04-01)
- **"impl i validacje rob auto, zatrzymaj sie przy testach"** — Auto mode through implementation + validation phases, stop at manual testing phase. (2026-04-01, AAA-T-153)
- **Gallery (grid) as default view for all CMS list pages** — list is secondary. (2026-04-01, AAA-T-159)
- **Stacked card layout (image-top, text-below), not horizontal** — User rejected image-left/text-right card layout for blog and media galleries ("nie wygląda tak jak sobie to wyobrażałem"). Stacked is the standard. (2026-04-01, AAA-T-159)
- **Single expand/collapse button for paired panels** — In workflow step execution detail, one button toggles both input+output panels together, not separate buttons per panel. (2026-04-01, AAA-T-159)
- **Light theme for Oleg's shop** — "dla odmiany bardziej jasny styl, nie bijąca w oczy biel, jakiś odcień." Warm linen off-white, not pure white. (2026-04-02)
- **Sidebar filters for e-commerce shops** — When shop has many categories, use sidebar category filter (240px), not horizontal pill bar. More standard e-commerce pattern. (2026-04-02)
- **Prominent is_featured toggle** — User wanted "more prominent" than a simple checkbox. Card with Star icon + Switch + description text + amber accent border. (2026-04-02)
- **Self-reflection iteration in auto mode** — User wants orchestrator to ask itself clarifying questions and answer them before implementing, even in auto mode. Deepens understanding at key decision points. (2026-04-02)
- **Bidirectional marketplace sync** — Not just publish, also status sync (sold/expired → grayed out in CMS) + import existing listings from marketplace into CMS as products. (2026-04-02)
- **Auto-publish option for marketplace** — User wants product.published → auto-publish to connected marketplaces. Planned as workflow engine trigger for future. (2026-04-02)
- **CMS configures n8n marketplace access** — Marketplace n8n config managed from CMS, not directly in n8n. (2026-04-02)
- **Polish labels in types.ts deferred to iteration 10** — LISTING_STATUS_LABELS, SYNC_STATUS_LABELS etc. hardcoded Polish in types.ts. Technically should be in messages.ts but works as type-level constants. Consolidate during Polish pass (iter 10). (2026-04-02, AAA-T-157)
