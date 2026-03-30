# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-03-30)

**Status:** Started iteration 1 (DB schema). Side project — praca w wolnym czasie.
**Scope:** E-commerce: Both Kolega (pallets) AND Tata (books) are catalog-only with external links (NO Stripe — changed from original plan 2026-03-30). Single Supabase, CMS extended (`features/shop-*`), separate frontends under `apps/shop/tata/` and `apps/shop/kolega/` (nested, not flat).
**Start order:** Tata first, then Kolega.
**Key decisions:** `shop_` prefixed tables, `listing_type` PostgreSQL ENUM (first enum in project — all previous tables used CHECK/TEXT), `media_folders` with `parent_id` nesting from day one, tenant feature flags. `NUMERIC(10,2)` for price (not INTEGER grosze). `TEXT[]` for tags (not JSONB). `shop_categories` flat (no parent_id). `gallery` and `editorial` as `display_layout` values (intent-based naming over implementation-based like "grid"/"list").
**Dual PROJECT_SPEC:** `docs/PROJECT_SPEC.yaml` (AAA-P-4 Core CMS) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9 Shop). Shop work may require updates to Core CMS spec.
**Plan:** 10 iterations. Graph: 1 → 2 → [3+4] → 5 → [7+8] → 9 → 10. Critical: 1→2→5→7→10.

## Workflow Engine — New Feature (2026-03-29)

**Status:** PLANNED (not started). Extends Core CMS (AAA-P-4). 11 Notion tasks with "Workflow:" prefix.
**Scope:** Per-tenant workflow automation. Two-layer: CMS (routing/config) + n8n (heavy execution). Visual builder (reactflow), explicit save, dynamic email template variables via trigger payload schemas.
**Key decisions:** Circular trigger protection (max depth=1), delay via n8n cron (±5 min), coexistence with current n8n email.
**Plan:** 11 iterations. Graph: 1→2→[3+4]→5a→5b→[6+7]→[8+9]→10. Critical: 1→2→5a→5b→6→10.

## Roadmap & Planning (2026-03-30)

**Next up:** Workflow Engine (XL, ~1 tydzień) → potem wszystkie emaile (booking confirmation, cancellation, reminder) jako workflow triggery.
**Key decision (2026-03-30):** NIE hardcode'ować emaili w n8n osobno — workflow engine najpierw, emaile potem jako triggery. Powód: uniknięcie podwójnej roboty (form_confirmation już raz przepisywaliśmy). Dog fooding własnej platformy przed onboardingiem klienta.
**Priority order:** workflow engine → email triggers → client onboarding.
**Key decisions:** No pricing page (individual approach), roles: super_admin/admin/member + feature permissions, Plausible self-hosted.
**Backlog:** Multi-language, CRM/Slack, Reporting, Onboarding, Newsletter, booking_cancellation.

## Email Notifications — COMPLETED (2026-03-13)

Phase 1 (n8n form_confirmation) + Phase 2 (CMS template editor + live preview) — both done.

## Media Library — AAA-T-75 — COMPLETED (2026-03-24)

Multi-tenant (WITH tenant_id — changed from single-tenant). S3 folder: `haloefekt/media/`. Video limit: 50MB.

## CTA → Survey Flow — AAA-T-57 — COMPLETED (2026-03-24)

**Survey:** 7 pytań, scoring max 15 pkt (10-15 hot, 6-9 warm, 1-5 cold). AI: MiniMax-M2.7 via n8n.
All 3 CTAs (Navbar, Hero, FinalCTA) point to `/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4`.

## Intake Hub — AAA-T-124 — COMPLETED (2026-03-28)

Unified `/admin/intake` replacing 3 pages. @dnd-kit kanban, JIRA-style split view, autosave notes.
Composes from responses + appointments (ADR-005 compliant).

## Survey Improvements — AAA-T-8 + AAA-T-95 — COMPLETED (2026-03-30)

**Scope:** Tally-style redesign of survey builder (CMS) and survey form (Website). 5 iterations + validator fixes.
**Iterations:** (1) Type refactoring — remove `as any`, delete deprecated actions.ts. (2) Data model — `semantic_role`, `placeholder`, `date` type, fix `label→question` mismatch. (3) Website form — shadcn/ui components (RadioGroup, Select, Checkbox, Textarea replacing native HTML), progress bar, DatePicker. (4) CMS builder — @dnd-kit drag-drop, duplicate question, layout swap (questions left, sidebar 420px right), AlertDialog replacing window.confirm, unsaved changes indicator. (5) Intake Hub — semantic_role lookup for client name/email/company/phone, contact info panel in detail view.
**Extra deliverables:** Shared `DatePicker` component in `@agency/ui` (Popover+Calendar, Polish locale, month/year dropdown, ±7yr range). Centralized `apps/cms/lib/query-keys.ts` (14 files migrated). `RadioGroup` added to `@agency/ui`. PipelineCard AI analysis spinner for new responses (<2min).
**Key decisions:** `semantic_role` on Question (not new question types) — separation of rendering vs business semantics. No DB migration — JSONB fields. Contact fields button creates only name+email (required), not company/phone. Native `input[type=date]` replaced everywhere with shared DatePicker.
**Tasks closed:** AAA-T-95 (type refactoring), AAA-T-8 (survey improvements), AAA-T-131 (drag-drop merged into T-8).

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"dawaj auto" / "auto" = switch to auto mode** — User says this when they want all phases to run without confirmation between them. Treat as --auto flag. BUT: always stop at Phase 5 (manual testing) — user must test manually regardless of auto mode. (2026-03-23)
- **No backward compatibility (pre-launch only)** — No clients/content yet, so breaking old data is fine now. Once clients onboard and real content exists, backward compatibility becomes required. (2026-03-23)
- **Test after each priority level, not each fix** — User prefers batching: fix all P0 → test → fix all P1 → test → fix all P2 → test. Individual commits per fix, but testing grouped by severity. (2026-03-25)
- **Commit per change, test later** — User wants individual commits after each refactor but defers manual testing to the end. Collect all test scenarios and present together. (2026-03-25)
- **Contact fields: only name + email, not company/phone** — "Dodaj pola kontaktowe" should create only 2 fields (Imię i nazwisko, Adres email), both required. User explicitly removed Firma and Telefon — too presumptuous for a generic survey tool. (2026-03-30)
- **No placeholders in contact fields** — User rejected placeholder text like "Jan Kowalski" as unsensible. Contact fields have empty placeholders. (2026-03-30)
- **Reusable component over inline duplication** — User asked "Nie można z tego stworzyć komponentu?" when seeing Popover+Calendar duplicated in 3 places. Prefers extracting to @agency/ui immediately, not "later." (2026-03-30)
- **Extract query keys to central file** — User asked for centralized query key file for discoverability ("żebyśmy wiedzieli jakie queries mamy"). Created `apps/cms/lib/query-keys.ts`. Blog/media kept their own patterns. (2026-03-30)
- **"Bez folderu" renamed to "Główne"** — User said "bez foldera brzmi dziwnie". Changed unsorted/unfoldered media label from "Bez folderu" to "Główne" — more natural naming for root media items. (2026-03-30)
- **Drag handle too small** — User sent screenshot showing tiny grip icon on media cards. Increased from h-4 w-4 p-0.5 to h-5 w-5 p-1.5. (2026-03-30)
- **InsertMediaModal needs folder filter** — User requested folder filter in blog media insertion modal ("przy blogu, przy dodawaniu mediów, też fajnie mieć tam możliwość wyboru folderu"). Added folder Select dropdown to InsertMediaModal LibraryTab. (2026-03-30)
- **Media don't have to be in folders** — User emphasized "nie wszystko musi być w folderze". folder_id=NULL is a valid, normal state — not "uncategorized". (2026-03-30)
- **DnD over simple dropdown for move-to-folder** — User chose "zrobmy dnd" when given choice between dropdown and drag-and-drop for moving media items to folders. (2026-03-30)

## Bugs Found

- **updateSurveySchema rejects null description** — `z.string().optional()` accepts `undefined` but NOT `null`. DB stores `null` for empty description. Fix: `.nullable().optional()`. Common Zod pitfall with nullable DB columns. (2026-03-27)
- **useMutation + Server Action structured return = silent failure** — TanStack Query `useMutation` treats any non-thrown result as success. Server Actions returning `{ success: false }` don't trigger `onError`. Fix: wrap mutationFn to throw on `!result.success`. (2026-03-27)
- **supabase gen types prepends "Initialising login role..." to output** — `npx supabase gen types typescript --linked` consistently corrupts `packages/database/src/types.ts` with a debug line on line 1. Workaround: pipe through `grep -v "^Initialising"`. (2026-03-28)
- **datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` produces `"2026-03-28T14:30"` (no seconds/timezone) but `z.string().datetime()` requires full ISO 8601. Fix: `z.string().min(1)`. (2026-03-28)
- **Native input[type=date] unreliable on dark theme** — After selecting a date, picker wouldn't reopen. Replaced everywhere with shared `DatePicker` component (Popover+Calendar from react-day-picker). Also fixes styling inconsistency. (2026-03-30)
- **router.refresh() doesn't invalidate TanStack Query cache** — SurveyBuilder did `router.push` + `router.refresh()` after save, but survey list (useQuery) showed stale data. Fix: `queryClient.invalidateQueries()` before push. `router.refresh()` only refreshes Server Components, not client-side cache. (2026-03-30)
- **Survey delete doesn't invalidate Intake Hub cache** — Deleting a survey left stale responses in Intake Hub. Fix: add `invalidateQueries(['intake'])` in SurveyList, SurveyBuilder delete handlers + `revalidatePath` in server action. (2026-03-30)
- **PipelineCard shows no indicator during AI analysis** — New responses had empty AI score slot (no spinner, no text) for 5-8s while n8n processes async. Fix: show Loader2 spinner when response is 'new', aiScore===null, and createdAt < 2min ago. (2026-03-30)
- **Shared validators label vs question field mismatch** — `packages/validators/src/survey.ts` used `label: z.string()` but CMS SurveyBuilder always stored `question` field. Stale since initial build. Fix: rename to `question` in schema. No DB migration needed (JSONB). (2026-03-30)
- **npm run db:types fails with --local when local Supabase not running** — `db:types` script uses `--local` flag but requires local Supabase instance. When not running, must use `--linked` with `grep -v "Initialising"` workaround. Also: `supabase db push` may require re-authentication when session expires. (2026-03-30)
- **formatPrice divided by 100 for NUMERIC(10,2) column** — Agent assumed cents storage pattern, but DB uses NUMERIC(10,2) which stores actual values (99.99 not 9999). Fix: remove /100. Common AI mistake when generating price formatters. (2026-03-30)
- **Supabase JS v2.95.2 `as any` needed even for SELECT** — Not just TablesInsert bug. `.from('shop_products')` resolves to `never` in complex chain contexts even for SELECT. Upgrade Supabase JS might fix but is separate task. (2026-03-30)
- **Turbopack barrel re-export breaks Server Components** — `export { X } from 'module'` in a file imported by Server Actions causes "Expected export to be in eval context" error. Fix: `import { X } from 'module'; export const X2 = X`. Affected blog/utils.ts and shop-products/utils.ts. (2026-03-30)

## Domain Concepts

- **Plausible Analytics** — Self-hosted at `analytics.trustcode.pl`, data-domain `haloefekt.pl`. Conversion funnel: CTA Clicked → Survey Started → Survey Submitted → Booking Completed. Goals must be manually created in Plausible dashboard. No cookies = no RODO. (2026-03-26)
- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`. Credentials: `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. S3 public GET; CORS must allow PUT from CMS domains. (2026-03-18)
- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953. (2026-03-23)
- **deleteAppointment does NOT remove Google Calendar event** — DB row deleted only, no Calendar API call. Notion ticket created. Requires `@agency/calendar` token manager. (2026-03-28)
- **Tata's books are digital only (not physical)** — No physical/hardcover books. Digital content sold via external platform (Zolix), with option for free downloads from S3. Both listing_types (external_link + digital_download) have real use cases. (2026-03-30)
- **Tata purchase flow: Zolix for paid + optional free S3 downloads** — external_link for paid books (redirects to Zolix), digital_download for free materials (S3 direct download). Two distinct listing_type values for different flows. (2026-03-30)
- **Cookie banner reuse + Plausible for shop** — Plausible doesn't require cookies/RODO consent. Cookie banner reused from Halo Efekt at zero cost. Polityka prywatności = good practice (no legal requirement without payment). (2026-03-30)
- **Media folders: ON DELETE SET NULL** — Deleting a folder moves its items to root (folder_id=NULL), doesn't delete them. Folder = organization label, not ownership. (2026-03-30)
- **"Główne" = root/unfoldered media** — Not "unsorted" or "uncategorized". Just media without a specific folder. Normal default state. (2026-03-30)

## SEO Foundations — AAA-T-60 + AAA-T-85 — COMPLETED (2026-03-29)

`site_settings` table (one row per tenant, anon SELECT). `React.cache()` for request dedup.
Google Search Console verification code: `GCfETKDyC-evSaMt_NyqAihacXKNVV30zIpP5VfOUSo`

## Architecture Audit — AAA-T-83 (2026-03-25)

**Status:** COMPLETE. Deferred items documented in Notion (BlogPostEditor/CalendarBooking split, lib→features moves, .env.local.example).

## Domain Concepts (Email Infrastructure)

- **email_configs table empty in production (2026-03-27)** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`). CMS email config feature planned.
- **notification_email is per survey_link, not per tenant** — Each link has own notification address. Future: pre-fill from email_configs.from_email.

## Architecture Decisions (Email Config Feature — 2026-03-27)

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency.
- **pgcrypto for API key encryption** — `email_configs_decrypted` view for n8n. API key masked in client (`re_****abcd`).
- **Survey required fields (imię + email) — RESOLVED in AAA-T-8** — Was deferred from email config. Implemented via `semantic_role` — see Survey Improvements section. (2026-03-30)
- **semantic_role on Question (not new type)** — Chosen over dedicated field types (e.g., `client_name` type). Reasoning: question type = rendering (text/email/select), semantic_role = business meaning (client_name/email/company/phone). Two orthogonal dimensions — mixing them creates cartesian product. Tally uses the same pattern. (2026-03-30)
- **DatePicker component in @agency/ui** — Shared across website (survey form, calendar booking) and CMS (future). Props: value, onChange, placeholder, minDate, maxDate, disabled. Uses Popover+Calendar (react-day-picker), Polish locale, month/year dropdown (captionLayout="dropdown"), ±7yr range, auto-close on select. (2026-03-30)
- **Centralized query keys** — `apps/cms/lib/query-keys.ts` holds all TanStack Query keys (surveys, intake, responses, appointments, landing, calendar). Blog/media have own key factories in their queries.ts. 14 files migrated. Prevents typos, single place for discoverability. (2026-03-30)
- **generateSlug extracted to shared lib/utils/slug.ts** — Was duplicated between blog/utils.ts and shop-products/utils.ts (2 usages = earned abstraction). Both features re-export from shared location. (2026-03-30)
- **Shop categories queries.server.ts included** — Both browser and server queries for categories (needed for SSR product forms with category dropdown). (2026-03-30)
- **Cross-project update rule** — When AAA-P-9 (Shop) tasks affect core CMS, update BOTH PROJECT_SPECs. (2026-03-30)
- **AAA-T-136 lives in AAA-P-4 (Core CMS)** — Media folders are core infrastructure, not shop-specific. Cross-project: required by AAA-P-9 but owned by AAA-P-4. Pattern: infrastructure tasks live where their "home" is. (2026-03-30)
- **Media folder files: folder-* prefix** — Separate files (folder-types.ts, folder-queries.ts, folder-actions.ts, folder-validation.ts) not merged into existing media files. Folders are a distinct concern. Prefix `folder-` to distinguish from media item files. (2026-03-30)
- **getMediaItems folder_id filter: undefined=all, null=root, string=folder** — Critical backward compat: default undefined returns ALL items (InsertMediaModal depends on this). null is NOT the default — it specifically means "root/unfoldered items only". (2026-03-30)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **/develop command: docs before merge** — Phase 5 reordered: (1) Notion + PROJECT_SPEC update, (2) auto-invoke /extract-memory, (3) merge to main. All doc commits land on feature branch inside --no-ff merge bubble. Phase 6 absorbed into Phase 5. (2026-03-26)
- **JIRA-style split view preferred over Sheet overlay** — User explicitly asked for detail panel next to the table/kanban instead of overlay drawer. Pattern: inline 480px panel on xl+ (≥1280px), navigate to full page on smaller screens. Closable with X. (2026-03-28, AAA-T-124)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter (loses audit trail). To allow more submissions, increase max_submissions instead. User confirmed 2026-03-28 (AAA-T-88).
- **Cross-project task organization in Notion** — Core infrastructure tasks live in AAA-P-4 Core CMS, not consuming project. Notes: `Cross-project: wymagane przez AAA-P-9`. Task lives where its "home" is. (2026-03-29)
