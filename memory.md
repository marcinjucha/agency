# Project Memory: Halo Efekt

## Shop Platform — New Project (2026-03-29)

**Status:** PLANNED (not started)
**Scope:** E-commerce platform as extension of existing Turborepo monorepo.

**Two clients:**
- **Kolega (first):** Product catalog from pallets, hundreds of items, links to OLX/Allegro (external_link). No payments.
- **Tata (later):** Book sales, digital downloads, Stripe payments, download link after purchase.

**Architecture decisions:**
- **Single Supabase project** — shop tables prefixed with `shop_` in same DB as Halo Efekt. Reuses auth, RLS, getUserWithTenant(), media library. Migration to separate project possible later.
- **CMS extended** (not separate app) — `features/shop-products/`, `features/shop-categories/` added to `apps/cms`. Sidebar gets new "Sklep" section to separate from "Agencja" features.
- **Separate frontends per client** — `apps/shop-kolega/`, later `apps/shop-tata/`. Different UI per client, no builder.
- **Product model:** `shop_products` table with `listing_type` enum (`external_link` | `digital_download`), Tiptap rich text description, `seo_metadata` JSONB, cover image + image array.
- **Media folders:** New `media_folders` table + `folder_id` on `media_items` for organization/segregation. Tenant-filtered.
- **Tenant feature flags:** `enabled_features` JSONB on tenants table (iteration 9, not blocking).

**10-iteration plan:**
1. DB schema (shop_products, shop_categories, media_folders) — M
2. CMS foundation (types, queries, actions, validation) — M
3. CMS product list + category management — M
4. Media library folder support — M (parallel with 3)
5. CMS product editor (Tiptap + media + 2 layouts) — L
6. apps/shop-kolega scaffolding — M (parallel with 3+4)
7. Shop-kolega product catalog — M
8. Homepage + search + SEO — M (parallel with 7)
9. Tenant feature flags + conditional sidebar — S
10. Polish, testing, deployment — M

**Dependency graph:** 1 → 2 → [3 + 4] → 5 → [6 already done] → [7 + 8] → 9 → 10
**Critical path:** 1 → 2 → 5 → 7 → 10

**Reuse from Halo Efekt:**
- packages/ui, packages/database, packages/email
- features/editor/ (Tiptap with dependency injection)
- features/media/ (add folder support)
- SEO patterns, legal pages, Plausible, blog patterns, email notifications, auth + RLS

**Side project** — praca w wolnym czasie, obok sprintów Halo Efekt.

## Roadmap & Planning (2026-03-20)

**Sprint 1 (current):** CTA → Survey flow + Regulamin/RODO/Cookies
**Sprint 2:** Plausible Analytics + SEO + Roles & Permissions + Intake Hub (replaces Kanban + Response Status)
**Sprint 3:** Email booking_confirmation + booking_reminder
**Backlog:** Multi-language, CRM/Slack integrations, Reporting, Onboarding, Newsletter, booking_cancellation

**Key decisions:**
- No pricing page — individual client approach, "umów się na rozmowę" instead
- Contact form = reuse existing survey+calendar flow (no new backend code)
- Kanban board consolidates with response list (responses ARE leads) → evolved into Intake Hub (AAA-T-124, 2026-03-28)
- Roles: super_admin/admin/member + granular feature permissions per user
- Plausible self-hosted on VPS (privacy-friendly, no cookies)
- New Notion project: "Halo Efekt - VPS Infrastructure" for server-side services
- Priority order: marketing (acquire clients) → intake/permissions (manage clients) → CMS polish

## Email Notifications — COMPLETED (2026-03-13)

Phase 1 (n8n form_confirmation) + Phase 2 (CMS template editor + live preview) — both done.

## Media Library — AAA-T-75 — COMPLETED (2026-03-24)

Multi-tenant (WITH tenant_id — changed from single-tenant). S3 folder: `haloefekt/media/`. Video limit: 50MB.

## CTA → Survey Flow — AAA-T-57 (2026-03-24)

**Status:** Partial — CTA integration done, survey creation in CMS pending
**Survey:** 7 pytań, scoring max 15 pkt (10-15 hot, 6-9 warm, 1-5 cold). AI: MiniMax-M2.7 via n8n.
**Remaining:** create survey in CMS, update CTA href, E2E test

## Intake Hub — AAA-T-124 — COMPLETED (2026-03-28)

Unified `/admin/intake` replacing 3 pages. @dnd-kit kanban, JIRA-style split view, autosave notes.
Composes from responses + appointments (ADR-005 compliant).

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"dawaj auto" / "auto" = switch to auto mode** — User says this when they want all phases to run without confirmation between them. Treat as --auto flag. BUT: always stop at Phase 5 (manual testing) — user must test manually regardless of auto mode. (2026-03-23)
- **No backward compatibility (pre-launch only)** — No clients/content yet, so breaking old data is fine now. Once clients onboard and real content exists, backward compatibility becomes required. (2026-03-23)
- **Test after each priority level, not each fix** — User prefers batching: fix all P0 → test → fix all P1 → test → fix all P2 → test. Individual commits per fix, but testing grouped by severity. (2026-03-25)
- **Commit per change, test later** — User wants individual commits after each refactor but defers manual testing to the end. Collect all test scenarios and present together. (2026-03-25)

## Bugs Found

- **updateSurveySchema rejects null description** — `z.string().optional()` accepts `undefined` but NOT `null`. DB stores `null` for empty description. Fix: `.nullable().optional()`. Common Zod pitfall with nullable DB columns. (2026-03-27)
- **useMutation + Server Action structured return = silent failure** — TanStack Query `useMutation` treats any non-thrown result as success. Server Actions returning `{ success: false }` don't trigger `onError`. Fix: wrap mutationFn to throw on `!result.success`. (2026-03-27)
- **supabase gen types prepends "Initialising login role..." to output** — `npx supabase gen types typescript --linked` consistently corrupts `packages/database/src/types.ts` with a debug line on line 1. Workaround: pipe through `grep -v "^Initialising"`. (2026-03-28)
- **datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` produces `"2026-03-28T14:30"` (no seconds/timezone) but `z.string().datetime()` requires full ISO 8601. Fix: `z.string().min(1)`. (2026-03-28)

## Domain Concepts

- **Plausible Analytics** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. Conversion funnel: CTA Clicked → Survey Started → Survey Submitted → Booking Completed. Goals must be manually created in Plausible dashboard. No cookies = no RODO. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`. Credentials: `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. S3 public GET; CORS must allow PUT from CMS domains. (2026-03-18)
- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953. (2026-03-23)
- **deleteAppointment does NOT remove Google Calendar event** — DB row deleted only, no Calendar API call. Notion ticket created. Requires `@agency/calendar` token manager. (2026-03-28)

## SEO Foundations — AAA-T-60 + AAA-T-85 — COMPLETED (2026-03-29)

`site_settings` table (one row per tenant, anon SELECT). `React.cache()` for request dedup.
Google Search Console verification code: `GCfETKDyC-evSaMt_NyqAihacXKNVV30zIpP5VfOUSo`

## Domain Concepts (Landing Page)

- **Landing page CTA destination** — AAA-T-57 DONE: all 3 CTA locations (Navbar, Hero, FinalCTA) now point to `/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4`. DEFAULT_BLOCKS updated. DB row must be updated via CMS editor. (2026-03-24)

## Architecture Audit — AAA-T-83 (2026-03-25)

**Status:** COMPLETE (2026-03-25). Structural changes in code/git.

**Deferred items (documented in Notion):**
- BlogPostEditor 674L + CalendarBooking 559L — split into subcomponents
- lib/google-calendar/ → features/calendar/ (363L business logic in lib/)
- @agency/email used only by CMS — consider moving to app
- Speculative types in responses/types.ts + appointments/types.ts — remove unused
- .env.local.example files missing

## Domain Concepts (Email Infrastructure)

- **email_configs table empty in production (2026-03-27)** — All 0 rows. Every email sent by n8n uses hardcoded fallback: Resend API key + `noreply@haloefekt.pl`. CMS Settings email config feature planned to fill this gap.
- **survey_links.notification_email = private Gmail addresses** — All 5 survey links in production have @gmail.com notification emails (markos734@, trustcodepl@, mjucha92@, jan.kowalski@). These are OK for now — will be updated organically when surveys are recreated with firmowy email. (2026-03-27)
- **notification_email is per survey_link, not per tenant** — Each survey link has its own notification address (set in CMS when creating link). No default from tenant config. Future enhancement: pre-fill from email_configs.from_email.

## Architecture Decisions (Email Config Feature — 2026-03-27)

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency.
- **pgcrypto for API key encryption** — `email_configs_decrypted` view for n8n. API key masked in client (`re_****abcd`).
- **Survey required fields (imię + email) — deferred** — Deferred to AAA-T-8 (Survey Builder Improvements). Intake Hub fallback: "Odpowiedź #N" for old data. (2026-03-28)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **Agency Tasks DB: "Type" property removed** — User removed Type property from Agency Tasks DB (2026-03-23). Schema now: Name, Status, Priority, Deadline, Notes, Projects (relation), Client (relation), ID.
- **Centralized route constants: lib/routes.ts** — Both CMS and Website now have `lib/routes.ts` (like `messages.ts`). Static routes = strings, dynamic = functions. CMS: 24 routes, 35 files updated. Website: 12 routes, 12 files updated. Prevents typos in hrefs, revalidatePath, API fetch calls. (2026-03-26, AAA-T-58)
- **CMS sidebar grouped thematically** — User requested grouping during AAA-T-58 testing. Groups: (no label) Pulpit, **Intake** (Ankiety, Intake hub, Kalendarz — after AAA-T-124), **Treść** (Strona główna, Blog, Media, Strony prawne), **System** (Szablony email, Ustawienia). Tiny uppercase labels at 60% opacity. (2026-03-26, updated 2026-03-28)
- **/develop command: docs before merge** — Phase 5 reordered: (1) Notion + PROJECT_SPEC update, (2) auto-invoke /extract-memory, (3) merge to main. All doc commits land on feature branch inside --no-ff merge bubble. Phase 6 absorbed into Phase 5. (2026-03-26)
- **JIRA-style split view preferred over Sheet overlay** — User explicitly asked for detail panel next to the table/kanban instead of overlay drawer. Pattern: inline 480px panel on xl+ (≥1280px), navigate to full page on smaller screens. Closable with X. (2026-03-28, AAA-T-124)
- **Autosave over manual save buttons** — User prefers autosave with debounce (1s) for text fields like internal notes. No explicit "Save" button needed — just show status indicator (saving/saved/error). (2026-03-28, AAA-T-124)
- **Notes preview on Kanban cards** — User wants 2-line truncated note text on cards, not just an icon. Quick scanning without opening detail view. (2026-03-28, AAA-T-124)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter (loses audit trail). To allow more submissions, increase max_submissions instead. User confirmed 2026-03-28 (AAA-T-88).
- **Scheduled publishing: derived status, no migration** — 3 states (draft/scheduled/published) derived from `is_published` + `published_at` at render time via `getPostStatus()`. No new DB column needed. Website filters `published_at <= now()` — ISR revalidate=60 means ~60s delay max. Calendar component added to `packages/ui/` (react-day-picker v9). (2026-03-28, AAA-T-107)
- **CMS editor pages: full width, no max-w constraints** — Removed `max-w-3xl` from landing page route and `max-w-7xl` from blog editor. Admin layout `p-8` provides sufficient margin. 2-column grid `lg:grid-cols-[1fr_380px]` for all editors. (2026-03-29, AAA-T-60)
- **Shared keyword combobox pattern** — `KeywordSelect` is a pure presentational component (no internal data fetching). Accepts `pool: string[]` and `isLoading` props. Each consumer fetches pool via own query. Avoids cross-feature coupling. (2026-03-29)
- **Cross-project task organization in Notion** — Core infrastructure tasks (media folders AAA-T-136, tenant feature flags AAA-T-141) live in AAA-P-4 Core CMS, not AAA-P-9 Platforma Sklepowa, even though shop needs them. Notes field documents `Cross-project: wymagane przez AAA-P-9`. Task lives where its "home" is, consumers reference it. (2026-03-29)
