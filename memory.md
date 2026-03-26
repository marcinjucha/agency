# Project Memory: Halo Efekt

## Roadmap & Planning (2026-03-20)

**Sprint 1 (current):** CTA → Survey flow + Regulamin/RODO/Cookies
**Sprint 2:** Plausible Analytics + SEO + Roles & Permissions + Lead Pipeline Kanban
**Sprint 3:** Email booking_confirmation + booking_reminder + T-5 Response Status
**Backlog:** Multi-language, CRM/Slack integrations, Reporting, Onboarding, Newsletter, booking_cancellation

**Key decisions:**
- No pricing page — individual client approach, "umów się na rozmowę" instead
- Contact form = reuse existing survey+calendar flow (no new backend code)
- Kanban board consolidates with response list (responses ARE leads)
- Roles: super_admin/admin/member + granular feature permissions per user
- Plausible self-hosted on VPS (privacy-friendly, no cookies)
- New Notion project: "Halo Efekt - VPS Infrastructure" for server-side services
- Priority order: marketing (acquire clients) → intake/permissions (manage clients) → CMS polish

## Email Notifications — Phase 1 DONE, Phase 2 COMPLETED (2026-03-13)

### Phase 1 (COMPLETED 2026-03-06)
**Scope:** n8n workflow for form_confirmation (hardcoded HTML template)

**Delivered:**
1. `survey_links.client_email` NOT NULL migration
2. `email_configs` table (per-tenant: provider, api_key, from_email, from_name, is_active)
3. n8n Subworkflow: Send Email — accepts `{ to, subject, html, from?, tenant_id }`, fetches tenant config, falls back to default Resend key
4. n8n Workflow: Form Confirmation Email — webhook → fetch response → build HTML → Send Email
5. Website fire-and-forget webhook call, CMS client email required
6. `N8N_WEBHOOK_EMAIL_URL` env var

**Technical:** Resend via native `https` (n8n sandbox blocks fetch/SDK). Per-tenant config via `email_configs`. HTML hardcoded in n8n Code node.

### Phase 2 (COMPLETED 2026-03-13 - E2E TEST PASSED)

**Completed Components:**
- `email_templates` migration with RLS and default seed
- React Email package (@agency/email) with block editor blocks
- CMS email template manager with block editor + live preview
- n8n Form Confirmation Email workflow updated to fetch html_body from DB

**Architecture Changes Discovered:**
- Email NOT to client (who only gets success page)
- Email IS notification to kancelaria (law firm) about new submission
- `survey_links.client_email` = law firm email (attorney provides when creating link)
- CTA button in email → links to CMS for response management

## Media Library — AAA-T-75 (2026-03-23)

**Status:** COMPLETE (2026-03-24), all 6 iterations done
**Scope:** 6 iteracji w Notion page content with checkboxes

**Key decisions (UPDATED 2026-03-23):**
- **WITH tenant_id** — user changed from single-tenant to multi-tenant (opposite of blog_posts original pattern)
- blog_posts also got tenant_id + tenant-isolated RLS (migration 20260323000000)
- media_items CRUD open to all authenticated users in tenant (no owner restriction — permissions deferred)
- Anon SELECT on blog_posts unchanged (website shows all published posts regardless of tenant)
- S3 folder: `haloefekt/media/` (separate from `haloefekt/blog/`)
- All uploads (drag-drop, paste, modal) must create media_items record
- Video limit: 50MB, presigned URL 300s for media folder
- Paste handler + Insert Media Modal — both active for YouTube/Vimeo embeds

**All iterations DONE:** DB → Foundation → Media Page → Tiptap Extensions → Insert Media Modal → Website CSS

## CTA → Survey Flow — AAA-T-57 (2026-03-24)

**Status:** Partial — CTA integration done, survey creation in CMS pending

**Key decisions:**
- Relative path `/survey/[uuid]` (not full URL) — survey is on same domain (website app)
- Survey link: `/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4` (created manually in CMS)
- Navbar: IntersectionObserver on `#hero-cta` — nav CTA appears when Hero CTA scrolls out of view (`rootMargin: '-80px 0px 0px 0px'` accounts for navbar height)
- Navbar: transparent at top, glass morphism on scroll (no floating pill — caused element collapse on lg screens)
- `overflow-x-hidden` on `<body>` — standard for landing pages with decorative overflow elements (glow orbs)

**Survey qualification design (7 pytań):**
- imię, email, tel, firma+branża (text), wielkość firmy (select: 1-3/4-10/11-30/31-100/100+), obszary (checkbox: 6 opcji), opis wyzwania (textarea, optional)
- Scoring max 15 pkt: 10-15 hot, 6-9 warm, 1-5 cold
- AI kwalifikacja w n8n już zbudowana — model: MiniMax-M2.7 (switched from Claude Haiku 2026-03-25, AAA-T-94)

**Remaining:** stworzenie ankiety w CMS, update CTA href w CMS editor (DB row), E2E flow test

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"dawaj auto" / "auto" = switch to auto mode** — User says this when they want all phases to run without confirmation between them. Treat as --auto flag. BUT: always stop at Phase 5 (manual testing) — user must test manually regardless of auto mode. (2026-03-23)
- **No backward compatibility (pre-launch only)** — No clients/content yet, so breaking old data is fine now. Once clients onboard and real content exists, backward compatibility becomes required. (2026-03-23)
- **Visual dimension decisions → design-agent** — Embed heights, widths, spacing, layout dimensions are design decisions, not just code. Use design-agent (not code-developer-agent) when tuning visual dimensions like iframe heights, max-widths, aspect ratios. Code-developer-agent for CSS implementation, design-agent for deciding the values. (2026-03-24)
- **Direct code edits allowed for tiny changes** — User accepts direct edits (not via agent) for trivial string changes (3 href values, 1 className). Agents required for feature-level changes, not micro-fixes. (2026-03-24)
- **Test after each priority level, not each fix** — User prefers batching: fix all P0 → test → fix all P1 → test → fix all P2 → test. Individual commits per fix, but testing grouped by severity. (2026-03-25)
- **Commit per change, test later** — User wants individual commits after each refactor but defers manual testing to the end. Collect all test scenarios and present together. (2026-03-25)

## Bugs Found

- **next-plausible: no 404s extension + scriptProps.src override fails** — `next-plausible` `allModifiers` list doesn't include `404s`. Tried `scriptProps.src` override — didn't work. Correct approach: skip script extension entirely, call `plausible('404', {props: {path}})` manually via `usePlausible` hook in `not-found.tsx`. Gives path-level reporting in Plausible dashboard. (2026-03-26)
- **pages table missing html_body column — Notion plan gap (AAA-T-58)** — `pages` table (migration 20260317200000) had `blocks JSONB` but NO `html_body` column. Blog uses `html_body` for website rendering via `dangerouslySetInnerHTML`. Analyst plan missed this — migration had to ADD COLUMN in addition to ALTER CHECK. Always verify actual DB schema vs assumptions. (2026-03-26)
- **n8n MiniMax parser: content[0] assumes no thinking block** — MiniMax returns `content: [{type:"thinking",...}, {type:"text",...}]` but parser used `content[0].text` (assumed text at index 0). Fix: `.find(c => c.type === 'text')`. Applies to any model with extended thinking via Anthropic-compatible API. FIXED 2026-03-25 (AAA-T-94).

## Domain Concepts

- **Plausible Analytics integration (AAA-T-90)** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. Uses `next-plausible` library (PlausibleProvider + usePlausible hook). 3 script extensions via props: outbound-links, file-downloads, tagged-events. 404 tracking via manual `plausible('404', {props: {path}})` in both not-found.tsx files (global + blog). Type map in `lib/plausible.ts`. Conversion funnel: CTA Clicked (with location prop) → Survey Started → Survey Submitted → Booking Completed. Goals must be manually created in Plausible dashboard after deploy. No cookies = no RODO consent needed for analytics. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`, folder: `haloefekt/blog/`. Credentials stored as `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. Same bucket holds n8n backups — new uploads go into separate folder. S3 bucket policy allows public GET; CORS must allow PUT from CMS domains for presigned upload to work. (2026-03-18)
- **Tenant "Halo Efekt" already exists in production** — email: kontakt@haloefekt.pl, domain: null, id: 19342448-4e4e-49ba-8bf0-694d5376f953. No need to INSERT new tenant. (2026-03-23)
- **Tiptap editor: shared features/editor/ with dependency injection** — TiptapEditor extracted from blog to `features/editor/` (2026-03-26, AAA-T-58). Accepts `extensions`, `mediaModal`, `onOpenMediaModal`, `embedDimensions`, `onEditorReady` as optional props. `baseExtensions` in `editor/extensions.ts` (StarterKit, Link, Image, Underline, TextAlign). Blog wraps with media extensions + InsertMediaModal. Legal pages uses plain defaults. `generateHtmlFromContent(content, extensions?)` defaults to baseExtensions. `features/editor/` has ZERO imports from any consuming feature. (2026-03-23 → updated 2026-03-26)
- **Media flow: images/video only via Library** — TiptapEditor drag/paste opens media modal instead of uploading directly. Images and video inserted into editor only from Library tab. YouTube/Vimeo/Instagram/TikTok paste auto-detect still works via extension paste rules. (2026-03-23)

## Domain Concepts (Landing Page)

- **Landing page CTA destination** — AAA-T-57 DONE: all 3 CTA locations (Navbar, Hero, FinalCTA) now point to `/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4`. DEFAULT_BLOCKS updated. DB row must be updated via CMS editor. (2026-03-24)

## Architecture Audit — AAA-T-83 (2026-03-25)

**Status:** COMPLETE — 41 commits, merged to main 2026-03-25. 40 issues fixed, 10 deferred. Also fixed 2 pre-existing bugs during testing (email template save, survey list cache).

**Key structural changes:**
- `apps/cms/lib/auth.ts` — shared `getUserWithTenant()` helper (eliminated 4x duplication)
- `apps/website/features/calendar/slot-calculator.ts` + `settings-cache.ts` + `booking.ts` + `validation.ts` — extracted from monolithic API routes
- `apps/cms/features/calendar/oauth-callback.ts` — extracted from auth callback route
- `EmptyState/ErrorState/LoadingState` moved from both apps → `@agency/ui`
- `SeoMetadata` consolidated to `@agency/database` (was 3 diverging definitions)
- `email/queries.ts` → `queries.server.ts` (naming convention fix)
- `surveys/validation.ts` created (was missing — 5 unvalidated actions)
- `landing/types.ts` created (types moved out of queries.ts)

**Deferred items (documented in Notion):**
- BlogPostEditor 674L + CalendarBooking 559L — split into subcomponents
- lib/google-calendar/ → features/calendar/ (363L business logic in lib/)
- @agency/email used only by CMS — consider moving to app
- Speculative types in responses/types.ts + appointments/types.ts — remove unused
- .env.local.example files missing

## CMS Settings — Calendar Card Consolidation (2026-03-25)

**Change:** Merged two separate Google Calendar cards (`CalendarSettings` + `CalendarTokenStatus`) into one unified `CalendarSettings` component. `CalendarTokenStatus.tsx` deleted.
**Why:** Redundant UX — both cards showed connection status independently. Single card handles all 3 states (connected/expired/disconnected) with `Promise.all` fetching both `getCalendarTokenStatus()` + `getGoogleCalendarStatus()`.
**Disconnect Dialog** moved outside conditional blocks — shared between connected and expired states.

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **Agency Tasks DB: "Type" property removed** — User removed Type property from Agency Tasks DB (2026-03-23). Schema now: Name, Status, Priority, Deadline, Notes, Projects (relation), Client (relation), ID.
- **Centralized route constants: lib/routes.ts** — Both CMS and Website now have `lib/routes.ts` (like `messages.ts`). Static routes = strings, dynamic = functions. CMS: 24 routes, 35 files updated. Website: 12 routes, 12 files updated. Prevents typos in hrefs, revalidatePath, API fetch calls. (2026-03-26, AAA-T-58)
- **CMS sidebar grouped thematically** — User requested grouping during AAA-T-58 testing. Groups: (no label) Pulpit, **Intake** (Ankiety, Odpowiedzi, Wizyty, Kalendarz), **Treść** (Strona główna, Blog, Media, Strony prawne), **System** (Szablony email, Ustawienia). Tiny uppercase labels at 60% opacity. (2026-03-26)
- **/develop command: docs before merge** — Phase 5 reordered: (1) Notion + PROJECT_SPEC update, (2) auto-invoke /extract-memory, (3) merge to main. All doc commits land on feature branch inside --no-ff merge bubble. Phase 6 absorbed into Phase 5. (2026-03-26)
