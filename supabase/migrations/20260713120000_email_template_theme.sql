-- ==========================================
-- Email Template Theme — per-template theme selection (email_templates.theme_id FK -> so_themes)
-- ==========================================
-- Phase 1 — DATA-MODEL LAYER ONLY (no TS/domain/UI code).
-- Design ratified in docs/EMAIL_TEMPLATE_ARCHITECTURE.md.
--
-- Builds on (dependency: so_themes must already exist):
--   20260711140000_venture_theme_library.sql (so_themes named theme library + the
--     tenants.theme_id / so_clients.theme_id / so_campaigns.theme_id FK pattern this mirrors verbatim).
--   20260311000000_create_email_templates.sql (email_templates table; RLS via current_user_tenant_id();
--     NO REVOKE SELECT, NO column allow-list → relies on Supabase's DEFAULT table-level authenticated grant).
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- Strictly ADDITIVE. Does NOT touch or reference migrations 20260711130000 / 140000 / 150000
-- (complete, pending-merge). Depends only on so_themes already existing.
--
-- WHY: mirrors the established nullable FK pattern from 20260711140000 (tenants/so_clients/so_campaigns
-- theme_id). Per-template theme override; the resolver owns the fallback chain
-- (template.theme_id ?? tenants.theme_id, then hardcoded HALO_EFEKT_DEFAULT).

-- ==========================================
-- theme_id FK on email_templates (nullable, ON DELETE SET NULL)
-- ==========================================
-- ON DELETE SET NULL matches the tenants/so_clients/so_campaigns precedent verbatim — deleting a theme
-- never orphans a template row; it falls back to the org theme / hardcoded default.
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL;

COMMENT ON COLUMN email_templates.theme_id IS
  'Nullable FK -> so_themes(id), ON DELETE SET NULL. Per-template theme override. NULL = inherits tenant '
  'theme (resolver: template.theme_id ?? tenants.theme_id, then hardcoded HALO_EFEKT_DEFAULT).';

-- ----- Grant: NO re-assert needed (unlike so_clients / so_campaigns) -----
-- email_templates is NOT column-scoped: 20260311000000_create_email_templates.sql only ENABLEs RLS and
-- creates policies — it never REVOKEs SELECT nor grants a column allow-list. The table therefore relies on
-- Supabase's DEFAULT table-level authenticated grant (this is exactly what 20260711140000 lines ~88-89
-- state: "email_templates/so_clients rely on Supabase's default authenticated grant"). A bare ADD COLUMN is
-- consequently auto-visible to `authenticated` — do NOT add any GRANT here. (Contrast: so_clients/so_campaigns
-- have a column-scoped SELECT allow-list — hiding plaintext secrets — so every new column MUST be re-asserted
-- there; email_templates has no such allow-list, so nothing to re-assert.)

-- ==========================================
-- VERIFICATION (runnable — no role switch)
-- ==========================================
SELECT has_column_privilege('authenticated', 'email_templates', 'theme_id', 'SELECT'); -- expect t
--
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "theme_id" packages/database/src/types.ts   -- theme_id: string | null on email_templates
