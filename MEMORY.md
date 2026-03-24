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
- AI kwalifikacja w n8n już zbudowana — feed scoring rubric do Claude Haiku

**Remaining:** stworzenie ankiety w CMS, update CTA href w CMS editor (DB row), E2E flow test

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"trustcode.pl" → user meant AWS bucket only** — When user mentioned adding trustcode.pl to remotePatterns in context of AWS, they meant the S3 bucket hostname only, not a wildcard *.trustcode.pl domain. (2026-03-18)
- **"dawaj auto" / "auto" = switch to auto mode** — User says this when they want all phases to run without confirmation between them. Treat as --auto flag. BUT: always stop at Phase 5 (manual testing) — user must test manually regardless of auto mode. (2026-03-23)
- **No Co-Authored-By footer in commits** — User does not want AI attribution footer in commit messages. Never add "Co-Authored-By: Claude" or similar. (2026-03-23)
- **Always use defined agents** — User explicitly requires using agents (code-developer-agent, design-agent, etc.) for ALL code changes. Writing code directly without agents is not acceptable. (2026-03-23)
- **No backward compatibility (pre-launch only)** — No clients/content yet, so breaking old data is fine now. Once clients onboard and real content exists, backward compatibility becomes required. (2026-03-23)
- **Visual dimension decisions → design-agent** — Embed heights, widths, spacing, layout dimensions are design decisions, not just code. Use design-agent (not code-developer-agent) when tuning visual dimensions like iframe heights, max-widths, aspect ratios. Code-developer-agent for CSS implementation, design-agent for deciding the values. (2026-03-24)
- **Navbar floating pill (lg:left-auto lg:right-auto + fixed) collapses element** — Tailwind `fixed` + `lg:max-w-5xl` + `lg:left-auto lg:right-auto` causes header to collapse to 0 width on large screens. `left-auto/right-auto` on fixed element without explicit width = content-sized = invisible. Fix: keep fixed navbar always full-width, only change background styles. (2026-03-24)
- **Direct code edits allowed for tiny changes** — User accepts direct edits (not via agent) for trivial string changes (3 href values, 1 className). Agents required for feature-level changes, not micro-fixes. (2026-03-24)

## Bugs Found

- **TanStack Query invalidateQueries key mismatch** — `mediaKeys.list()` returns `['media-items', 'list', undefined]` but active query key is `mediaKeys.list({ type: undefined })` = `['media-items', 'list', { type: undefined }]`. These don't match so invalidation silently fails. Fix: use `mediaKeys.all` to invalidate all list variants. Pattern: always use the root key (`all`) for broad invalidation after mutations. (2026-03-23)
- **shadcn CLI fails in packages/ui** — `npx shadcn@latest add` throws "resolvedPaths: Required" error in Turborepo monorepo packages/ui context. Workaround: install Radix dependency manually (`npm install @radix-ui/react-tabs --workspace=@agency/ui`) and create the component file manually following existing shadcn pattern. (2026-03-23)
- **Tiptap renderHTML must use inline styles, not Tailwind classes** — Custom Tiptap extensions renderHTML output goes into blog_posts.html_body which website renders as raw HTML without Tailwind processing. Tailwind classes (aspect-video, w-full) produce unstyled/tiny elements on website. Fix: use inline `style="..."` attributes in renderHTML. Applies to all future extensions. (2026-03-23)

## Domain Concepts

- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`, folder: `haloefekt/blog/`. Credentials stored as `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. Same bucket holds n8n backups — new uploads go into separate folder. S3 bucket policy allows public GET; CORS must allow PUT from CMS domains for presigned upload to work. (2026-03-18)
- **S3 upload helper belongs in `utils.ts`** — Shared upload logic (presigned URL fetch + PUT) extracted to `features/blog/utils.ts` as `uploadImageToS3(file, folder?)`. Used by both `BlogPostEditor` (cover image) and `TiptapEditor` (inline images). (2026-03-19)
- **Tenant "Halo Efekt" already exists in production** — email: kontakt@haloefekt.pl, domain: null, id: 19342448-4e4e-49ba-8bf0-694d5376f953. No need to INSERT new tenant. (2026-03-23)
- **tenant_id fetch pattern duplicated 4x** — blog/actions.ts, email/actions.ts, surveys/actions.ts, media/actions.ts all query users table for tenant_id. Architecture audit flagged for extraction to shared getUserWithTenant() helper. (2026-03-23)
- **Tabs + Progress not in @agency/ui** — shadcn/ui Tabs and Progress components were missing. Added manually in Iteration 3 via Radix primitives + existing shadcn pattern. Now exported from packages/ui/src/index.ts. (2026-03-23)
- **Tiptap extension registry pattern** — `features/blog/extensions/index.ts` exports `editorExtensions` (single source of truth) and `mediaExtensions`. Both `TiptapEditor.tsx` and `utils.ts` import from here. Adding new media type = 1 new extension file + 1 line in index.ts. Shared video utilities live in `lib/video-utils.ts`. (2026-03-23)
- **Shared video utilities in `lib/`** — `extractVideoId`, `generateThumbnailUrl`, `buildEmbedUrl`, `fetchVimeoThumbnail` all live in `apps/cms/lib/`. Used by both `features/blog` and `features/media` — placing in either feature would create cross-feature import violation. (2026-03-23)
- **Media flow: images/video only via Library** — TiptapEditor drag/paste opens media modal instead of uploading directly. Images and video inserted into editor only from Library tab. YouTube/Vimeo/Instagram/TikTok paste auto-detect still works via extension paste rules. (2026-03-23)
- **Instagram/TikTok embed final dimensions** — Cross-origin iframes cannot auto-report content height, so fixed height is the only approach. Final values after iterative testing (2026-03-24): Instagram 800px height / 500px max-width, TikTok 740px height / 330px max-width (TikTok content is narrower than Instagram). Both centered with `background: #000`. AAA-T-78 resolved.
- **EMBED_DIMENSIONS constants pattern** — `apps/cms/features/blog/extensions/constants.ts` exports `EMBED_DIMENSIONS` object + `INSTAGRAM_INLINE_STYLE` / `TIKTOK_INLINE_STYLE` string constants. Extensions import these for renderHTML inline styles. TiptapEditor.tsx uses JSX `${EMBED_DIMENSIONS.instagram.height}px` interpolation in style block. Website `globals.css` stays manual (cannot import JS) but has a comment: "Source of truth: constants.ts". Changing dimensions in future = 1 file (constants.ts) + 1 file (globals.css). (2026-03-24)

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
- **Landing page CTA destination** — AAA-T-57 DONE: all 3 CTA locations (Navbar, Hero, FinalCTA) now point to `/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4`. DEFAULT_BLOCKS updated. DB row must be updated via CMS editor. (2026-03-24)

## Preferences

- **Notion tasks: single task with checklist content, not subtasks** — User prefers one task with plan broken into checkboxes in page body, not 7 separate tasks. Reason: flexibility to partially complete and pause without managing many task statuses. (2026-03-23)
- **Agency Tasks DB: "Type" property removed** — User removed Type property from Agency Tasks DB (2026-03-23). Schema now: Name, Status, Priority, Deadline, Notes, Projects (relation), Client (relation), ID.
