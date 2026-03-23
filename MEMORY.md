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

## Blog Feature — COMPLETED (2026-03-18)

**Key decisions:**
- Single-tenant (no tenant_id) — blog promotes the agency, same pattern as `landing_pages`
- Tiptap editor (not Plate.js) — headless, full Tailwind/shadcn control, JSON storage (JSONB)
- HTML pre-rendered on CMS save (`html_body` column) — website uses SSR with stored HTML, no Tiptap on website
- S3 upload: bucket `legal-mind-bucket`, region `eu-central-1`, folder `haloefekt/blog/`, presigned URLs
- Draft preview via `preview_token` (UUID) — service role client bypasses RLS

## Media Library — AAA-T-75 (2026-03-23)

**Status:** In Progress, Urgent, Iteration 1/6 DONE
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

**Iteration 1 DONE:** media_items table, blog_posts tenant_id, RLS, types regenerated
**Remaining:** Foundation(M) → Media Library Page(L) + Tiptap Extensions(M) → Insert Media Modal(L) → Website CSS(S)

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"trustcode.pl" → user meant AWS bucket only** — When user mentioned adding trustcode.pl to remotePatterns in context of AWS, they meant the S3 bucket hostname only, not a wildcard *.trustcode.pl domain. (2026-03-18)
- **"dawaj auto" = switch to auto mode** — User says this when they want all phases to run without confirmation between them. Treat as --auto flag. (2026-03-23)

## Domain Concepts

- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`, folder: `haloefekt/blog/`. Credentials stored as `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. Same bucket holds n8n backups — new uploads go into separate folder. S3 bucket policy allows public GET; CORS must allow PUT from CMS domains for presigned upload to work. (2026-03-18)
- **S3 upload helper belongs in `utils.ts`** — Shared upload logic (presigned URL fetch + PUT) extracted to `features/blog/utils.ts` as `uploadImageToS3(file, folder?)`. Used by both `BlogPostEditor` (cover image) and `TiptapEditor` (inline images). (2026-03-19)
- **Tenant "Halo Efekt" already exists in production** — email: kontakt@haloefekt.pl, domain: null, id: 19342448-4e4e-49ba-8bf0-694d5376f953. No need to INSERT new tenant. (2026-03-23)
- **tenant_id fetch pattern duplicated 3x** — blog/actions.ts, email/actions.ts, surveys/actions.ts all query users table for tenant_id. Architecture audit flagged for extraction to shared getUserWithTenant() helper. (2026-03-23)

## Landing Page Redesign — Audit Findings (2026-03-20)

**Scope:** Full design audit → redesign plan. 9 sekcji → 7 sekcji. Plan w Notion AAA-T-72.

**Structural changes planned:**
- Merge `Guarantee.tsx` + `RiskReversal.tsx` → `Process.tsx` (timeline + zero-risk box)
- Merge `Benefits.tsx` + `Qualification.tsx` → `Results.tsx` (metric strip + outcomes + reframed qualification)
- New `Identification.tsx` section (qualifiers moved from Hero)
- Hero simplified: 8 content blocks → 3 elements above fold (headline + subheadline + CTA)

**Block schema changes planned (packages/database/src/landing-blocks.ts):**
- New: `IdentificationBlock`, `ProcessBlock`, `ResultsBlock`
- Modified: `HeroBlock` (simplified), `CtaBlock` (added trustLine)
- Removed: `GuaranteeBlock`, `RiskReversalBlock`, `BenefitsBlock`, `QualificationBlock`

## Domain Concepts (Landing Page)

- **Positioning docs already exist** — `.claude/docs/agency/` has 5 complete docs (Oferta, Strategia, Positioning-Broad, Brand-Guide, Sales-Playbook). AAA-T-71 (Pozycjonowanie) deliverables are effectively done — just needs review/approval before closing. (2026-03-20)
- **Landing page CTA destination** — Currently all CTAs point to `#contact` (dead). Plan: AAA-T-57 creates contact survey + generates a survey_link URL → that URL goes into all 3 CTA locations (Navbar, Hero, FinalCTA). (2026-03-20)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **Agency Tasks DB: "Type" property removed** — User removed Type property from Agency Tasks DB (2026-03-23). Schema now: Name, Status, Priority, Deadline, Notes, Projects (relation), Client (relation), ID.
