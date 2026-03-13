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

## Feedback & Corrections

## Domain Concepts

## Preferences
