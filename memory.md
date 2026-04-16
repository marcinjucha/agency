# Project Memory: Halo Efekt

## Active Work

**Shop Platform (AAA-P-9):** Iter 1-8 done + kolega done. Remaining: iter 9 (feature flags) + iter 10 (polish/deploy). Both shops migrated to TanStack Start v1.167.
**Marketplace Integration (AAA-P-9):** Iter 1-10 done. Manual testing remaining. 4 standalone n8n workflows.
**CMS TanStack Start migration (AAA-T-192):** Core Setup + Auth + Layout DONE (2026-04-15). Next: per-feature tasks (surveys, shop, users, etc.).
**Website TanStack Start migration (AAA-T-191):** DONE (2026-04-15). 5 iterations. All Next.js code removed.

## Completed Features (compressed)

- Email Notifications, Media Library, CTA→Survey Flow, Intake Hub, Survey Improvements, SEO Foundations, Architecture Audit — Done (2026-03-13 to 2026-03-29)
- RBAC System (AAA-T-61+76), Tenant Management (AAA-T-170), DocForge Licenses (AAA-T-171) — Done (2026-04-06)
- Workflow Engine + n8n Orchestrator (AAA-T-143, AAA-T-177, AAA-T-179, AAA-T-182, AAA-T-183) — Done (2026-04-10/11). n8n owns all execution.
- Survey→Workflow Binding + AI Results (AAA-T-186, AAA-T-189) — Done (2026-04-14)
- Plugin Architecture (AAA-T-190), CMS TanStack Start scaffold (AAA-T-192) — Done (2026-04-15)
- Website TanStack Start migration (AAA-T-191) — Done (2026-04-15). 5 iterations, all Next.js removed.

## Feedback & Corrections

- **"dawaj auto"/"auto" = switch to auto mode** — All phases without confirmation. Always stop at Phase 5 (manual testing).
- **No backward compatibility (pre-launch only)** — No clients yet. Once clients onboard, backward compat required.
- **Validate after EACH iteration, not batched** — Run Phase 3+3b after every iteration completion.
- **Aggressive Boy Scout Rule for remeda/neverthrow** — Every file you touch must be converted to neverthrow + remeda. Not optional.
- **Always fix ALL found bugs immediately** — Never note-and-defer pre-existing bugs. Fix when you have context.
- **n8n Trigger Handler: Switch per trigger type, not if/else** — Each trigger type in dedicated Code node.
- **"do all now" = don't defer P2 items** — When design agent recommends deferring, user overrides.
- **Commit per change, test later** — Individual commits, deferred manual testing.
- **CMS migration per-feature tasks** — When migrating large apps, break into separate tasks per feature area.

## Bugs Found

- **TanStack Start Vercel deployment requires `nitro()` vite plugin** — Without `import { nitro } from 'nitro/vite'` + `nitro()` in plugins, Vercel can't generate serverless functions → 404 on all SSR routes. Works locally without it. Vercel Framework Preset = "TanStack Start" (built-in). Add `nitro` to deps. See tanstack-setup skill.
- **nitro() plugin crashes Vite dev server (ERR_LOAD_URL)** — `nitro()` from `nitro/vite` only needed for Vercel build, not dev. Fix: `...(command === 'build' ? [nitro()] : [])` in vite.config.ts. Applied to all 4 TanStack Start apps.
- **Ad blockers block files with "cookie" in URL path** — uBlock/AdGuard block HTTP requests containing "cookie". In Vite dev mode each .tsx is a separate request, so `CookieBanner.tsx` was blocked → `virtual:tanstack-start-client-entry` failed → zero hydration → static HTML with no JS. Fix: rename to `ConsentBanner.tsx`. Does NOT happen in Next.js (bundled chunks). WHY critical: symptoms look like SSR bug, not ad blocker.
- **ScrollReveal singleton breaks with Vite HMR** — Module-level `sharedObserver` + `callbacks` Map reset on HMR re-evaluation, but mounted components' `useEffect(fn, [])` don't re-run → IntersectionObserver callbacks lost. Fix: per-component `new IntersectionObserver()` inside useEffect.

- **`apps/website` dev server broken after TanStack CMS migration (2026-04-15)** — Turbopack (Next.js 16 default) throws "Cannot find module 'enhanced-resolve'" from `@tailwindcss/node` 4.2.2. Root cause likely: npm install during CMS TanStack setup upgraded `@tailwindcss/node` to v4.2.2 which added `enhanced-resolve` as new dep — Turbopack's PostCSS resolution can't find it. Workaround tried: added `enhanced-resolve` to website devDependencies — did not fix. Next steps: (1) check if `@tailwindcss/postcss` version lock would help, (2) disable Turbopack for website via `next.config.ts` as fallback.

- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. `db:types` uses --local, need --linked when local not running.
- **Supabase JS v2.95.2 `as any` needed** — `.from('table')` resolves to `never` in complex chains.
- **DatePicker toISOString() timezone bug** — `.split('T')[0]` shifts date -1 day in CEST. Fix: `getFullYear()/getMonth()/getDate()`. Affects any date stored as YYYY-MM-DD.
- **TanStack Query queryFn receives QueryFunctionContext as first arg** — Direct fn reference `queryFn: fn` injects Context object. Fix: wrap `queryFn: () => fn()` + explicit generic `useQuery<T>`.
- **Supabase `.select('id')` returns ONLY requested columns** — Test mocks returning full objects mask this. Always match mock shape to select list.
- **`step_type` on `workflow_steps`, NOT `workflow_step_executions`** — Must JOIN steps when querying step_type.
- **NULL `survey_link.workflow_id` = no workflow fires** — After per-link binding, links without workflow_id skip triggering. Backfill existing links.
- **Trigger route missing tenant_id verification** — Security: add tenant_id filter when looking up workflow by workflow_id.
- **Supabase mock arrays: count ALL `.from()` calls in pipeline** — Each call consumes one mock array entry. Short array = silent failure on second call.
- **`messages.nav.xxx` not `messages.navigation.xxx`** — Agent hallucinated key name. Always grep messages.ts. CMS uses `messages.nav` section.
- **`import.meta.env.VITE_*` not `process.env.NEXT_PUBLIC_*` in TanStack Start** — Vite SSR context (createServerFn, server-start.ts, client.ts) uses `import.meta.env.VITE_*` for .env.local vars. `process.env` is undefined in Vite bundles.

## Domain Concepts

- **TanStack Router `validateSearch` + `navigate({ search: fn })` 3-step pattern** — Search params require: (1) `validateSearch` with zod schema on route, (2) `useSearch({ from: routeId })` to read, (3) `navigate({ search: (prev) => ({ ...prev, key: val }) })` function form to update. Missing any step = type errors or silent failures.
- **`supabase.getAll/setAll` is correct API (not deprecated)** — In server-start.ts cookie handler, getAll/setAll are the current @supabase/ssr methods for reading/writing all cookies. Agent incorrectly flagged as deprecated.
- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953.
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **notification_email per survey_link, not per tenant** — Each link has own notification address.
- **surveys.status DB column is vestigial** — Status computed from survey_links. Manual enum management is wrong model.
- **responses.answers + surveys.questions are JSONB, no separate tables** — Trigger Handler reads both from parent tables.
- **Condition evaluator operators** — >=, <=, !=, ==, >, <, contains, in. NO single `=`. No `{{ }}` wrappers on field names.
- **Baikal CalDAV has 2 calendars** — tsdav auto-discovers "Appointments" + "Default calendar". Must filter.
- **Nil UUID fallback for Supabase filters** — `?? '00000000-...'` prevents PostgreSQL UUID parse errors on null values.

## Architecture Decisions

- **Cross-project update rule** — AAA-P-9 tasks affecting shared tables/packages require updating BOTH PROJECT_SPECs.
- **app_config table for encryption key** — Supabase Cloud blocks ALTER DATABASE SET for custom GUCs. `app_config` table + `get_encryption_key()` SECURITY DEFINER.
- **SurveyLinkCalendarSelect dual mode** — Discriminated union props: `{ mode: 'standalone' }` vs `{ mode: 'controlled' }`. Pattern for any component appearing both standalone and in forms.
- **Extract pure logic from .tsx to utils/ for TDD** — `.tsx` = rendering + hooks, `utils/*.ts` = pure testable functions.
- **n8n Orchestrator owns ALL execution** — CMS trigger route = ~70 LOC fire-and-forget. WHY: Vercel serverless timeout can't handle multi-hour workflow delays.
- **TanStack Start auth: beforeLoad mandatory, requestMiddleware optional** — beforeLoad (isomorphic) handles SSR + client navigation. requestMiddleware = server-only, misses client nav. See tanstack-server skill.
- **`admin.tsx` not `_admin.tsx` for /admin/* routes** — Pathless layout (underscore) adds no URL segment. `_admin/index.tsx` → URL `/`. See tanstack-setup skill.
- **Feature server-fns in `features/{name}/server-fns.ts`, NOT `lib/server-fns/`** — User corrected agent placing server functions in lib/. Each feature owns its server functions colocated with its other files. WHY: matches ADR-005 feature isolation pattern.
- **CMS migration uses parent branch strategy** — Dedicated `feature/cms-tanstack-migration` parent branch; child branches per feature merge back to parent; parent merges to main when ALL features done. WHY: allows deleting Next.js code immediately instead of maintaining coexistence.
- **`next` package stays in deps until ALL features migrated** — Even after removing Next.js infrastructure, unmigrated features still import next/cache, next/headers, next/link, next/navigation. Removing early breaks imports.
- **RSC prop patterns don't apply in TanStack Start** — Components that received full objects from RSC (e.g., SurveyBuilder receiving survey) should take ID + internal useQuery instead. WHY: TanStack Start has no RSC; passing serialized objects from loader is fragile vs letting component own its data fetching.
- **Website uses NO TanStack Query** — Unlike CMS (ensureQueryData in loader + useQuery in component), website uses simple `loader → Route.useLoaderData()`. No QueryClient in router context. WHY: website is public/cacheable (ISR via Cache-Control), no client-side mutations.
- **createServiceClient() replaces createAnonClient() in website** — Old `createAnonClient()` misleadingly created a service-role client. New pattern: `createServiceClient()` in `lib/supabase/service.ts` using `import.meta.env.VITE_SUPABASE_URL` + `process.env.SUPABASE_SERVICE_ROLE_KEY`. Must be called INSIDE createServerFn, never at module level.

## Preferences

- **Notion tasks: single task with checklist, not subtasks** — Flexibility to partially complete and pause.
- **/develop: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merging to main.
- **Multi-field detail panel = RHF form + Save button** — NOT pencil-per-field inline editing. Single-field list items = inline OK.
- **Native input type="date" rejected** — Always use shadcn/ui DatePicker (Popover + Calendar).
- **Always test with local database** — Never point dev to production Supabase.
- **Always design bidirectional state transitions** — If deactivate exists, activate must too.
- **Always use `vitest watch` during TDD** — Not `vitest run`. Watch mode for development, run for CI.
- **Collapsible panels: close button inside panel** — Not only external toggle.
- **Shorter skill names preferred** — Drop framework prefix when context is clear (e.g., "tanstack-setup" not "tanstack-start-setup").
