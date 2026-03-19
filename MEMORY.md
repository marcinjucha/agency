# Project Memory: Halo Efekt (Email Notifications Phase 2)

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

**E2E Test Results (2026-03-13):**
- Form Confirmation Email workflow tested end-to-end ✅
- Email successfully delivered to survey_links.client_email (kancelaria, NOT client) ✅
- All nodes execute correctly with real database data ✅

**Architecture Changes Discovered:**
- Email NOT to client (who only gets success page)
- Email IS notification to kancelaria (law firm) about new submission
- `survey_links.client_email` = law firm email (attorney provides when creating link)
- CTA button in email → links to CMS for response management

**Bug Fixes Applied (Session 2026-03-13):**
1. **Sentry Init** — `if (!Sentry.getClient())` guard prevents multiple initialization listeners
2. **Send Email** — Removed hardcoded `['markos734@gmail.com']`, use `Array.isArray(to) ? to : [to]`
3. **Task Runner Limitation** — `$env.CMS_BASE_URL` inaccessible in task runner context, hardcoded to `'https://cms.haloefekt.pl'`

**Code Updates:**
- `n8n-workflows/workflows/Sentry Init.json` — added guard
- `n8n-workflows/workflows/Send Email.json` — dynamic `to` handling
- `n8n-workflows/workflows/Form Confirmation Email.json` — new Fetch Tenant node, Build Email uses responseUrl, removed hardcoded cmsBaseUrl
- `packages/email/src/blocks/types.ts` — DEFAULT_BLOCKS for kancelaria notification
- `apps/cms/features/email/types.ts` — added `{{responseUrl}}` to TEMPLATE_VARIABLES
- `supabase/migrations/20260313000000_fix_form_confirmation_template.sql` — seed migration

## Blog Feature — COMPLETED (2026-03-18)

**Scope:** Blog CMS (WYSIWYG Tiptap editor) + public website listing/detail + S3 image upload + draft preview

**Key decisions:**
- Single-tenant (no tenant_id) — blog promotes the agency, same pattern as `landing_pages`
- Tiptap editor (not Plate.js) — headless, full Tailwind/shadcn control, JSON storage (JSONB)
- HTML pre-rendered on CMS save (`html_body` column) — website uses SSR with stored HTML, no Tiptap on website
- S3 upload: bucket `legal-mind-bucket`, region `eu-central-1`, folder `haloefekt/blog/`, presigned URLs
- Draft preview via `preview_token` (UUID) — service role client bypasses RLS
- Navbar rendered per-page (not in layout) — blog pages have own `app/blog/layout.tsx` with Navbar+Footer

**Files created:**
- Migration: `supabase/migrations/20260318000000_create_blog_posts.sql`
- CMS: `features/blog/` (types, queries, queries.server, validation, utils, actions, components/)
- Website: `features/blog/` (types, queries, utils, components/), `app/blog/layout.tsx`
- Routes: `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`, `/blog`, `/blog/[slug]`, `/blog/preview/[token]`

## Feedback & Corrections

- **validator-agent misses P2 architecture violations** — Phase 8 catches functional bugs (P0/P1) but not code organization issues: wrong file placement, code duplication, missing theme tokens. These require a separate architecture audit with explicit ADR-005 checklist. (2026-03-18)
- **"trustcode.pl" → user meant AWS bucket only** — When user mentioned adding trustcode.pl to remotePatterns in context of AWS, they meant the S3 bucket hostname only, not a wildcard *.trustcode.pl domain. (2026-03-18)

## Blog Improvements (2026-03-19)

**Scope:** Categories combobox, preview link fix, Tiptap image upload (S3), sticky toolbar, bubble menu

**Key changes:**
- `CategoryCombobox.tsx` — creatable combobox (shadcn Popover + Command) fetches distinct categories from `blog_posts`, sorted alphabetically, allows typing new ones
- `TiptapEditor.tsx` — S3 image upload via drag-drop/paste/toolbar file picker; `overflow-clip` replaces `overflow-hidden` for sticky toolbar; BubbleMenu on text selection; toolbar offset `top-[61px]` to clear BlogPostEditor's sticky top bar
- `EditorToolbar.tsx` — camera icon = file picker (primary), globe icon = URL input (secondary)
- `BlogPostEditor.tsx` — preview link uses `NEXT_PUBLIC_WEBSITE_URL`; content `JSON.stringify`-ed before Server Action
- `actions.ts` — `parseContent()` helper JSON.parses stringified content on server
- `packages/ui` — added Popover and Command components (cmdk v1.1.1, @radix-ui/react-popover)
- `globals.css` (website) — images in `.blog-prose` centered with `display: block; margin: auto`

## Bugs Found

- **Tiptap SSR hydration error** — `useEditor` without `immediatelyRender: false` causes hydration mismatch in Next.js. Fix: add `immediatelyRender: false` to `useEditor` options. (2026-03-18)
- **Tiptap extensions in Server Actions** — "Cannot access textAlign on the server" error. Tiptap extensions (TextAlign, StarterKit etc.) contain client references and cannot be imported in `'use server'` files. Fix: generate HTML on the client side (in component), pass `html_body` + `estimated_reading_time` as plain values to the server action. (2026-03-18)
- **Non-async exports in `'use server'` files** — All exported functions from a `'use server'` file must be async. Non-async helpers cause build error "Server Actions must be async functions". Fix: move helpers to a separate `utils.ts` file without `'use server'`. (2026-03-18)
- **`generateStaticParams` with cookie-based Supabase client** — `cookies()` called outside request scope at build time. `generateStaticParams` runs at build time, so `createClient()` (which uses cookies) fails. Fix: use `createAnonClient()` (service role, no cookies) for all website blog queries. (2026-03-18)
- **React Hook Form `setValue` + `handleSubmit` race condition** — Calling `setValue('is_published', x)` then immediately `handleSubmit(onSave)()` may read stale form value. Fix: pass the value as a parameter to `onSave` directly instead of relying on form state flush. (2026-03-18)
- **SEO metadata field name mismatch** — CMS stored `seo_metadata.ogImage` (camelCase) but website type had `og_image_url` (snake_case). OG image never resolved. Fix: align both to `ogImage`. (2026-03-18)

- **React Server Action strips Tiptap `attrs`** — React's Flight protocol drops nested `attrs` objects from Tiptap JSON nodes when they contain `null` values (e.g. `alt: null, title: null`). Image nodes become `{"type":"image"}` with no `src`. Fix: `JSON.stringify(content)` on client before passing to Server Action, `JSON.parse()` on server. Confirmed via `console.log` debug — save showed `attrs: undefined`. (2026-03-19)
- **`overflow-hidden` breaks `position: sticky`** — `.tiptap-editor` wrapper had `overflow-hidden` which prevents sticky positioning. Fix: use `overflow-clip` instead — clips visually but doesn't create a scroll container, sticky works. (2026-03-19)
- **Admin layout scroll container is `<main>`, not viewport** — `app/admin/layout.tsx` wraps content in `<main class="overflow-y-auto">`. Sticky elements inside must offset for other sticky bars above them. Editor toolbar needs `top-[61px]` (BlogPostEditor's own top bar height = py-3 + 36px button + border = ~61px). (2026-03-19)
- **cmdk v1.1.1 `displayName` undefined** — `CommandPrimitive.Input.displayName` throws "Cannot read properties of undefined" in cmdk v1.1.1. Fix: hardcode displayName strings (`"CommandInput"` etc.) instead of reading from primitive. (2026-03-19)
- **BubbleMenu import from `@tiptap/react/menus`** — `BubbleMenu` is not exported from `@tiptap/react` directly in Tiptap v2+. Import from `@tiptap/react/menus` instead. (2026-03-19)
- **Tiptap Image extension: don't add `inline: false` or `allowBase64: false`** — These options caused image nodes to be silently dropped during content parsing. Use only `HTMLAttributes` config. (2026-03-19)

## Domain Concepts

- **AWS S3 for media uploads** — Bucket: `legal-mind-bucket`, region: `eu-central-1`, folder: `haloefekt/blog/`. Credentials stored as `BUCKET_ACCESS_KEY` + `BUCKET_SECRET_KEY` in `apps/cms/.env.local`. Same bucket holds n8n backups — new uploads go into separate folder. S3 bucket policy allows public GET; CORS must allow PUT from CMS domains for presigned upload to work. (2026-03-18)
- **`validation.ts` = Zod schemas only** — Utility functions (slug generation, date formatting, reading time) belong in `utils.ts`, not `validation.ts`. Validator caught this as architecture violation during audit. (2026-03-18)
- **CMS query file split pattern** — When a feature needs both browser-client queries (for TanStack Query in components) and server-client queries (for SSR route pages), split into `queries.ts` (browser) and `queries.server.ts` (server). Mixing both in one file causes module boundary errors. (2026-03-18)
- **S3 upload helper belongs in `utils.ts`** — Shared upload logic (presigned URL fetch + PUT) extracted to `features/blog/utils.ts` as `uploadImageToS3(file, folder?)`. Used by both `BlogPostEditor` (cover image) and `TiptapEditor` (inline images). API route validates folder against `ALLOWED_FOLDERS` allowlist and content type against `ALLOWED_CONTENT_TYPES` to prevent path traversal. (2026-03-19)

## Bugs Found (2026-03-19 — Security + Architecture fixes)

- **S3 upload API path traversal** — `/api/upload` route accepted user-controlled `folder` param directly in S3 key. Fix: validate against `ALLOWED_FOLDERS` allowlist + strip `../` sequences. (2026-03-19)
- **S3 upload API missing server-side content type validation** — Client-side `file.type.startsWith('image/')` check is bypassable. Fix: added `ALLOWED_CONTENT_TYPES` allowlist check in API route before generating presigned URL. (2026-03-19)
- **`notFound()` on missing blog slug shows generic 404** — Next.js `notFound()` in `app/blog/[slug]/page.tsx` without a local `not-found.tsx` shows the root 404 page with no way back to blog. Fix: add `app/blog/[slug]/not-found.tsx` with "Wróć do bloga" link. (2026-03-19)
- **Non-async helper in `'use server'` file** — `parseContent()` was a non-async function inside `actions.ts` (`'use server'`). Works currently because it's not exported, but fragile. Fix: moved to `utils.ts` and imported. (2026-03-19)

## Preferences
