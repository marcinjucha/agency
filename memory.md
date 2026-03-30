# Project Memory: Halo Efekt

## Shop Platform — AAA-P-9 — IN PROGRESS (2026-03-30)

**Status:** Iterations 1-5 done (DB schema, CMS foundation, product list, media folders, product editor). Side project.
**Scope:** E-commerce: Both Kolega (pallets) AND Tata (books) are catalog-only with external links (NO Stripe). Single Supabase, CMS extended (`features/shop-*`), separate frontends under `apps/shop/tata/` and `apps/shop/kolega/` (nested, not flat). Tata first.
**Key decisions:** `shop_` prefixed tables, `listing_type` PostgreSQL ENUM, `gallery`/`editorial` display_layout (intent-based naming), `NUMERIC(10,2)` for price, `TEXT[]` for tags, flat categories.
**Tata purchase:** Zolix for paid books (external_link), S3 for free materials (digital_download). Books are digital only. Cookie banner reused, Plausible for analytics.
**Tata design:** Dark + warm amber ("library at night"), serif headings + sans body, editorial layout for book detail, minimal 3-link nav.
**Dual PROJECT_SPEC:** `docs/PROJECT_SPEC.yaml` (AAA-P-4) + `docs/SHOP_PROJECT_SPEC.yaml` (AAA-P-9).
**Plan:** 10 iterations. Graph: 1→2→[3+4]→5→[7+8]→9→10. Critical: 1→2→5→7→10.

## Workflow Engine — New Feature (2026-03-29)

**Status:** PLANNED (not started). Extends Core CMS (AAA-P-4). 11 Notion tasks with "Workflow:" prefix.
**Scope:** Per-tenant workflow automation. Two-layer: CMS (routing/config) + n8n (heavy execution). Visual builder (reactflow), explicit save, dynamic email template variables.
**Key decisions:** Circular trigger protection (max depth=1), delay via n8n cron (±5 min), coexistence with current n8n email.
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

## Bugs Found (project-specific patterns)

- **Zod .nullable().optional() for DB nullable** — `z.string().optional()` accepts undefined but NOT null. DB stores null. Fix: `.nullable().optional()`. Recurring across features. (2026-03-27)
- **useMutation + Server Action structured return = silent failure** — TanStack Query treats non-thrown results as success. Fix: throw on `!result.success`. Recurring. (2026-03-27)
- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. Also: `db:types` uses --local, need --linked when local not running. (2026-03-28)
- **Supabase JS v2.95.2 `as any` needed even for SELECT** — `.from('shop_products')` resolves to `never` in complex chains. Upgrade may fix. (2026-03-30)
- **handleSubmit needs onFormError callback** — Without it, validation errors silently swallowed. Also: empty number inputs send NaN → add Zod transforms NaN/''→null. (2026-03-30)

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

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — Flexibility to partially complete and pause. (2026-03-23)
- **/develop command: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merge to main. (2026-03-26)
- **JIRA-style split view over Sheet overlay** — Inline 480px panel on xl+, full page on smaller screens. (2026-03-28)
- **current_submissions read-only, max_submissions editable** — Never reset submission counter. (2026-03-28)
- **Cross-project task organization** — Infrastructure tasks live where their "home" is (AAA-P-4), not consuming project. (2026-03-29)
- **Inline editing over Dialog for simple CRUD** — In-place editing for simple entities. Dialog = overkill for 4 fields. (2026-03-30)
- **Combobox with inline create** — Create related entities without leaving current editor. Popover+Command pattern. (2026-03-30)
