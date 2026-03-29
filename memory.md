# Project Memory: Halo Efekt

## Shop Platform — New Project (2026-03-29)

**Status:** PLANNED (not started). Side project — praca w wolnym czasie.
**Scope:** E-commerce: Kolega (pallets catalog, external links) + Tata (books, Stripe). Single Supabase, CMS extended (`features/shop-*`), separate frontends (`apps/shop-kolega/`).
**Key decisions:** `shop_` prefixed tables, `listing_type` enum, media folders, tenant feature flags.
**Plan:** 10 iterations. Graph: 1 → 2 → [3+4] → 5 → [7+8] → 9 → 10. Critical: 1→2→5→7→10.

## Workflow Engine — New Feature (2026-03-29)

**Status:** PLANNED (not started). Extends Core CMS (AAA-P-4). 11 Notion tasks with "Workflow:" prefix.
**Scope:** Per-tenant workflow automation. Two-layer: CMS (routing/config) + n8n (heavy execution). Visual builder (reactflow), explicit save, dynamic email template variables via trigger payload schemas.
**Key decisions:** Circular trigger protection (max depth=1), delay via n8n cron (±5 min), coexistence with current n8n email.
**Plan:** 11 iterations. Graph: 1→2→[3+4]→5a→5b→[6+7]→[8+9]→10. Critical: 1→2→5a→5b→6→10.

## Roadmap & Planning (2026-03-20)

**Priority order:** marketing (acquire clients) → intake/permissions (manage clients) → CMS polish.
**Key decisions:** No pricing page (individual approach), roles: super_admin/admin/member + feature permissions, Plausible self-hosted.
**Backlog:** Multi-language, CRM/Slack, Reporting, Onboarding, Newsletter, booking_cancellation.

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

**Status:** COMPLETE. Deferred items documented in Notion (BlogPostEditor/CalendarBooking split, lib→features moves, .env.local.example).

## Domain Concepts (Email Infrastructure)

- **email_configs table empty in production (2026-03-27)** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`). CMS email config feature planned.
- **notification_email is per survey_link, not per tenant** — Each link has own notification address. Future: pre-fill from email_configs.from_email.

## Architecture Decisions (Email Config Feature — 2026-03-27)

- **`features/email-config/` separate from `features/email/`** — Config (ops) vs templates (content). Different actors, different change frequency.
- **pgcrypto for API key encryption** — `email_configs_decrypted` view for n8n. API key masked in client (`re_****abcd`).
- **Survey required fields (imię + email) — deferred** — Deferred to AAA-T-8 (Survey Builder Improvements). Intake Hub fallback: "Odpowiedź #N" for old data. (2026-03-28)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **/develop command: docs before merge** — Phase 5 reordered: (1) Notion + PROJECT_SPEC update, (2) auto-invoke /extract-memory, (3) merge to main. All doc commits land on feature branch inside --no-ff merge bubble. Phase 6 absorbed into Phase 5. (2026-03-26)
- **JIRA-style split view preferred over Sheet overlay** — User explicitly asked for detail panel next to the table/kanban instead of overlay drawer. Pattern: inline 480px panel on xl+ (≥1280px), navigate to full page on smaller screens. Closable with X. (2026-03-28, AAA-T-124)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter (loses audit trail). To allow more submissions, increase max_submissions instead. User confirmed 2026-03-28 (AAA-T-88).
- **Cross-project task organization in Notion** — Core infrastructure tasks live in AAA-P-4 Core CMS, not consuming project. Notes: `Cross-project: wymagane przez AAA-P-9`. Task lives where its "home" is. (2026-03-29)
