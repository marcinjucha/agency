# Project Memory: Halo Efekt

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
**Key domain insight:** Email is notification TO kancelaria about new submission (not to client). `survey_links.client_email` = law firm email. Client only sees success page. CTA in email → CMS response management.

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

## Intake Hub — AAA-T-124 — COMPLETED (2026-03-28)

**Scope:** Unified `/admin/intake` replacing 3 separate pages. Absorbs AAA-T-5, T-62, T-6, T-4.

**Key decisions:**
- JIRA-style inline detail panel (480px) on xl+ screens, navigate to full page on smaller — user rejected Sheet overlay in favor of split view
- @dnd-kit with PointerSensor `distance: 8` — without activation constraint, drag listeners consume onClick events
- Autosave internal notes (1s debounce) — user rejected manual save button
- Notes preview on Kanban cards (2-line `line-clamp-2`, not just icon) — user wanted quick scanning
- Shared constants in `features/intake/types.ts`: STATUS_LABELS, APPOINTMENT_STATUS_LABELS, getAiScoreBgColor/TextColor — extracted after validation audit caught duplication
- Stats query must filter appointments by user_id (same scope as getAppointments) — caught by validator, stats showed tenant-wide while table showed user-only
- `features/intake/` composes from responses + appointments — does NOT modify them, ADR-005 compliant

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
- **n8n MiniMax parser: content[0] assumes no thinking block** — MiniMax returns `content: [{type:"thinking",...}, {type:"text",...}]` but parser used `content[0].text` (assumed text at index 0). Fix: `.find(c => c.type === 'text')`. Applies to any model with extended thinking via Anthropic-compatible API. FIXED 2026-03-25 (AAA-T-94).
- **responses table missing DELETE RLS policy** — SELECT/UPDATE/INSERT existed but no DELETE policy. Supabase silently returns `error: null` + 0 affected rows when RLS blocks DELETE — Server Action reports success but nothing is deleted. Fix: migration `20260327000000_add_delete_policy_responses.sql`. Always verify all CRUD RLS policies exist before implementing delete features. (2026-03-27, AAA-T-92)
- **updateSurveySchema rejects null description** — `z.string().optional()` accepts `undefined` but NOT `null`. DB stores `null` for empty description. Fix: `.nullable().optional()`. Pre-existing bug surfaced during AAA-T-92 testing. (2026-03-27)
- **useMutation + Server Action structured return = silent failure** — TanStack Query `useMutation` treats any non-thrown result as success. Server Actions returning `{ success: false }` don't trigger `onError`. Fix: wrap mutationFn to throw on `!result.success`. (2026-03-27, AAA-T-92)
- **supabase gen types prepends "Initialising login role..." to output** — `npx supabase gen types typescript --linked` consistently corrupts `packages/database/src/types.ts` with a debug line on line 1. Must strip before TypeScript will compile. Workaround: pipe through `grep -v "^Initialising"`. (2026-03-28, AAA-T-124)
- **@dnd-kit drag listeners consume onClick** — `useDraggable` spreads `listeners` that intercept all pointer events. Cards become undraggable OR unclickable. Fix: add `PointerSensor` with `activationConstraint: { distance: 8 }` to `DndContext` — clicks (<8px) pass through, drags (>8px) activate D&D. (2026-03-28, AAA-T-124)
- **datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` input produces `"2026-03-28T14:30"` (no seconds, no timezone) but `z.string().datetime()` requires full ISO 8601. Fix: replace with `z.string().min(1)` — actual date parsing happens on PostgreSQL side (`timestamptz` column). Pre-existing bug in `generateSurveyLinkSchema`, also affected new `updateSurveyLinkSchema`. FIXED 2026-03-28 (AAA-T-88).

## Domain Concepts

- **Plausible Analytics integration (AAA-T-90)** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. Uses `next-plausible` library (PlausibleProvider + usePlausible hook). 3 script extensions via props: outbound-links, file-downloads, tagged-events. 404 tracking via manual `plausible('404', {props: {path}})` in both not-found.tsx files (global + blog). Type map in `lib/plausible.ts`. Conversion funnel: CTA Clicked (with location prop) → Survey Started → Survey Submitted → Booking Completed. Goals must be manually created in Plausible dashboard after deploy. No cookies = no RODO consent needed for analytics. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`, folder: `haloefekt/blog/`. Credentials stored as `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. Same bucket holds n8n backups — new uploads go into separate folder. S3 bucket policy allows public GET; CORS must allow PUT from CMS domains for presigned upload to work. (2026-03-18)
- **Tenant "Halo Efekt" already exists in production** — email: kontakt@haloefekt.pl, domain: null, id: 19342448-4e4e-49ba-8bf0-694d5376f953. No need to INSERT new tenant. (2026-03-23)
- **Tiptap editor: shared features/editor/ with dependency injection** — TiptapEditor extracted from blog to `features/editor/` (2026-03-26, AAA-T-58). Accepts `extensions`, `mediaModal`, `onOpenMediaModal`, `embedDimensions`, `onEditorReady` as optional props. `baseExtensions` in `editor/extensions.ts` (StarterKit, Link, Image, Underline, TextAlign). Blog wraps with media extensions + InsertMediaModal. Legal pages uses plain defaults. `generateHtmlFromContent(content, extensions?)` defaults to baseExtensions. `features/editor/` has ZERO imports from any consuming feature. (2026-03-23 → updated 2026-03-26)
- **Media flow: images/video only via Library** — TiptapEditor drag/paste opens media modal instead of uploading directly. Images and video inserted into editor only from Library tab. YouTube/Vimeo/Instagram/TikTok paste auto-detect still works via extension paste rules. (2026-03-23)
- **deleteAppointment does NOT remove Google Calendar event** — `appointments/actions.ts` only deletes the DB row. `google_calendar_event_id` column exists but no Calendar API call. Notion ticket created (2026-03-28). Requires `@agency/calendar` token manager for access token.
- **survey_links.is_active exists since initial migration** — Column added in migration `20251210143628`, not new. RLS `FOR ALL` policy already covers UPDATE. Website already validates `is_active` in `features/survey/queries.ts`. No migration needed for edit feature. (2026-03-28, AAA-T-88)

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

- **`features/email-config/` separate from `features/email/`** — Config (API key, provider, from address) is ops/admin concern. Templates (blocks, HTML, WYSIWYG) is content concern. Different actors, different change frequency.
- **pgcrypto for API key encryption (not Supabase Vault)** — `pgcrypto` already enabled (migration 20250105000001). Vault (pgsodium) needs verification + superuser. Using `pgp_sym_encrypt/decrypt` with key from `current_setting('app.encryption_key')`.
- **`email_configs_decrypted` view for n8n** — n8n reads `api_key` as plain text via Supabase node. View auto-decrypts, n8n changes only tableId (no Code node changes).
- **Test email via Server Action (not n8n)** — Fast operation <2s, direct Resend API call from CMS. Sends to logged-in admin's email. No n8n overhead needed.
- **API key masked in client** — queries.ts returns `re_****abcd`. Full key never in browser state. Form uses empty field + masked placeholder (avoids dirty state issues with pre-filled masked values).
- **`features/intake/` composes from responses + appointments** — New feature, does NOT modify existing `features/responses/` or `features/appointments/`. Sheet reuses `getResponse()` from responses/queries.ts. Pipeline has its own `getPipelineResponses()` (needs ai_qualification + answers for name extraction). ADR-005 compliant. (2026-03-28, AAA-T-124)
- **Survey required fields (imię + email) — deferred** — User wants to enforce first 2 questions as required (imię, email) in survey builder. Deferred to AAA-T-8 (Survey Builder Improvements). Intake Hub assumes name/email exist in answers; fallback "Odpowiedź #N" for old data. (2026-03-28)

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
