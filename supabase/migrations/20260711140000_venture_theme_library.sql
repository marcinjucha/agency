-- ==========================================
-- Venture Theme Library — named reusable themes (so_themes) + FK references
-- ==========================================
-- Iter D1 — DATA-MODEL LAYER ONLY (no TS/domain/UI code; those are Iter D2/D3).
-- Design ratified in docs/THEME_MANAGER_DESIGN.md (Option A: themes table + FK reference).
--
-- Builds on:
--   20260711130000_venture_client_theme.sql (inline tenants.theme + so_clients.theme JSONB;
--     the so_clients authenticated column allow-list ending in `theme` — 13 columns).
--   20260709170000 / 20260709163651 (the so_clients REVOKE SELECT + allow-list pattern).
--   20260705120000_create_venture_bonus_funnel.sql (so_* RLS style, current_user_tenant_id()
--     + is_super_admin() tenant isolation, update_updated_at() trigger).
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
--
-- WHY this migration (the shift):
--   From "theme = inline JSONB blob per row" (20260711130000) → themes become reusable NAMED
--   entities created once, then referenced/assigned at organization / client. Each so_themes row
--   stores the WHOLE ThemeTokens blob (9 hex color tokens + optional logoUrl/fontFamily) as a single
--   `tokens JSONB` — compatible with the locked rules (hex source-of-truth, whole-object JSONB;
--   NOT tokens-as-rows). The pure resolver signature {tenantTheme, clientTheme} is UNCHANGED — only
--   the caller swaps `read row.theme` → `read so_themes.tokens via row.theme_id`.
--
-- LOCKED RULES honored here:
--   1. hex source-of-truth, whole-object JSONB — `tokens JSONB`, hex-validated at the app boundary,
--      NOT a DB CHECK.
--   2. so_themes is NEVER anon-readable — authenticated-only (RLS + explicit REVOKE of anon).
--      The public landing path stays on so_campaigns.brand (already anon-granted, no secrets).
--   3. NO is_default column on so_themes — the org's default theme IS tenants.theme_id (single
--      source of truth). Deliberate simplification vs the design doc's Option-A sketch.
--   4. NO so_campaigns.theme_id — the campaign tier is deferred (resolver has no campaign tier yet;
--      MVP campaign is read-only "inherits from client").
--   5. KEEP the inline `theme` columns (do NOT drop / do NOT null) — defensive transition fallback
--      and future Option-C per-row override slot.

-- ==========================================
-- SECTION 1: so_themes (named theme library, tenant-scoped)
-- ==========================================
CREATE TABLE IF NOT EXISTS so_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE so_themes IS
  'Named reusable theme library, tenant-scoped. Each row = one whole ThemeTokens blob (9 hex color '
  'tokens + optional logoUrl/fontFamily) in tokens JSONB, hex-validated at the app boundary (no DB '
  'CHECK). No is_default column — the org default IS tenants.theme_id. Never anon-readable '
  '(authenticated-only); the public path stays on so_campaigns.brand.';

-- Case-insensitive uniqueness of theme name within a tenant (functional index — cannot be an
-- ON CONFLICT target, so the seed below uses insert-then-catch, not ON CONFLICT).
CREATE UNIQUE INDEX IF NOT EXISTS so_themes_tenant_name_key ON so_themes (tenant_id, lower(name));
CREATE INDEX IF NOT EXISTS so_themes_tenant_id_idx ON so_themes (tenant_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON so_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE so_themes ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (authenticated ONLY — NO anon). Mirrors so_clients: current_user_tenant_id()
-- (SECURITY DEFINER helper, no recursion) + is_super_admin() bypass. so_themes has no FK to a child
-- table, so there is no EXISTS chain and no recursion risk.
CREATE POLICY "Tenant users can view so_themes"
  ON so_themes FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can insert so_themes"
  ON so_themes FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can update so_themes"
  ON so_themes FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can delete so_themes"
  ON so_themes FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

-- Grants: authenticated needs table privileges the RLS relies on (email_templates/so_clients rely on
-- Supabase's default authenticated grant; grant explicitly here for self-documentation + safety).
GRANT SELECT, INSERT, UPDATE, DELETE ON so_themes TO authenticated;

-- Locked rule #2 — themes are NEVER anon-readable. RLS-enabled + no anon policy already denies rows,
-- but REVOKE anon explicitly so the column-privilege surface also shows no anon access (defensive:
-- prevents a future default-grant from silently exposing themes on the public path).
REVOKE ALL ON so_themes FROM anon;

-- ==========================================
-- SECTION 2: theme_id FK on tenants + so_clients (nullable, ON DELETE SET NULL)
-- ==========================================
-- Live reference (edit-once-propagates). NULL = "no named theme assigned here; fall to the next
-- level up / hardcoded Halo Efekt default" — the resolver still owns the fallback chain.
-- ON DELETE SET NULL + UI delete-guard (Iter D2) so deleting a theme never orphans a row.
ALTER TABLE tenants   ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL;
ALTER TABLE so_clients ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL;

COMMENT ON COLUMN tenants.theme_id IS
  'Nullable FK -> so_themes(id), ON DELETE SET NULL. The org base theme (single source of default '
  'truth — replaces any is_default flag). NULL = no named theme assigned; resolver falls to the '
  'hardcoded Halo Efekt default. Distinct from inline tenants.theme (kept as transition fallback).';

COMMENT ON COLUMN so_clients.theme_id IS
  'Nullable FK -> so_themes(id), ON DELETE SET NULL. Per-client theme assignment. NULL = "inherits '
  'from organization" (resolver falls to tenants.theme_id, then hardcoded default). Distinct from '
  'inline so_clients.theme (kept as transition fallback / future Option-C override slot).';

-- ----- 2a. Re-assert the so_clients authenticated SELECT allow-list WITH theme_id appended -----
-- CRITICAL (same gotcha as `theme` in 20260711130000): so_clients uses a column-scoped SELECT
-- allow-list for authenticated (the blanket table SELECT was REVOKEd in 20260709163651 to hide the
-- plaintext secret columns). A NEW column is NOT covered by that grant, so a CMS read of theme_id
-- would fail with "permission denied for column theme_id". Re-assert the exact current 13-column
-- list (from 20260711130000, ending in `theme`) with theme_id appended (14 columns). Only SELECT is
-- affected; INSERT/UPDATE stay at Supabase's default role grants, so the admin write path is intact.
REVOKE SELECT ON so_clients FROM authenticated;
GRANT SELECT (id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address,
              has_resend_api_key, has_gmail_app_password, sender_name, created_at, updated_at,
              theme, theme_id)
  ON so_clients TO authenticated;

-- ----- 2b. so_clients anon grant — deliberately UNTOUCHED -----
-- The anon allow-list stays the narrow `GRANT SELECT (id, slug) ON so_clients TO anon`
-- (20260709141553). theme_id is NOT anon-exposed. tenants uses the table-level authenticated grant,
-- so tenants.theme_id is auto-visible to authenticated — no re-assert needed there.

-- ==========================================
-- SECTION 3: Seed / reconcile existing inline themes -> named so_themes (idempotent)
-- ==========================================
-- For each row that currently carries a non-empty inline `theme` JSONB and has NO theme_id yet,
-- create a named so_themes row (tokens = the inline theme) and point theme_id at it. Guarded by
-- `theme_id IS NULL` → safe to re-run (a second run finds nothing to do). The inline `theme` columns
-- are intentionally LEFT INTACT (locked rule #5).
--   Staging: picks up existing test data (Kacper's so_clients.theme, Halo Efekt tenants.theme).
--   Prod: no inline themes exist → no-op.
-- Name = "<owner name> — motyw"; on the (tenant_id, lower(name)) unique index a collision appends a
-- numeric suffix (functional index cannot be an ON CONFLICT target, hence insert-then-catch).
DO $$
DECLARE
  r          RECORD;
  v_theme_id uuid;
  v_name     text;
  v_suffix   int;
BEGIN
  -- 3a. so_clients: per-client inline theme -> named theme
  FOR r IN
    SELECT id, tenant_id, name, theme
    FROM so_clients
    WHERE theme IS NOT NULL AND theme <> '{}'::jsonb AND theme_id IS NULL
  LOOP
    v_name   := r.name || ' — motyw';
    v_suffix := 1;
    LOOP
      BEGIN
        INSERT INTO so_themes (tenant_id, name, tokens)
        VALUES (r.tenant_id, v_name, r.theme)
        RETURNING id INTO v_theme_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_suffix := v_suffix + 1;
        v_name   := r.name || ' — motyw ' || v_suffix;
      END;
    END LOOP;
    UPDATE so_clients SET theme_id = v_theme_id WHERE id = r.id;
  END LOOP;

  -- 3b. tenants: per-org inline theme -> named theme
  FOR r IN
    SELECT id, name, theme
    FROM tenants
    WHERE theme IS NOT NULL AND theme <> '{}'::jsonb AND theme_id IS NULL
  LOOP
    v_name   := r.name || ' — motyw';
    v_suffix := 1;
    LOOP
      BEGIN
        INSERT INTO so_themes (tenant_id, name, tokens)
        VALUES (r.id, v_name, r.theme)
        RETURNING id INTO v_theme_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_suffix := v_suffix + 1;
        v_name   := r.name || ' — motyw ' || v_suffix;
      END;
    END LOOP;
    UPDATE tenants SET theme_id = v_theme_id WHERE id = r.id;
  END LOOP;
END $$;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Column-privilege spot checks (no role switch):
--   SELECT has_column_privilege('authenticated', 'so_clients', 'theme_id', 'SELECT'); -- expect t
--   SELECT has_column_privilege('authenticated', 'so_clients', 'theme', 'SELECT');    -- expect t (unchanged)
--   SELECT has_column_privilege('anon',          'so_clients', 'theme_id', 'SELECT'); -- expect f
--   SELECT has_column_privilege('authenticated', 'tenants',    'theme_id', 'SELECT'); -- expect t (table-level grant)
--   SELECT has_table_privilege('anon',          'so_themes', 'SELECT');               -- expect f (anon revoked)
--   SELECT has_table_privilege('authenticated', 'so_themes', 'SELECT');               -- expect t
--
-- so_themes tenant isolation (RLS): anon sees zero rows regardless of grant, authenticated is scoped.
--   SET ROLE anon; SELECT count(*) FROM so_themes; RESET ROLE; -- expect 0 (no anon policy / grant)
--
-- Seed reconciliation (staging — expect Kacper + Halo Efekt rows with theme_id wired):
--   SELECT t.name, t.tokens IS NOT NULL AS has_tokens FROM so_themes t ORDER BY t.created_at;
--   SELECT name, theme_id IS NOT NULL AS wired FROM so_clients WHERE theme IS NOT NULL AND theme <> '{}'::jsonb;
--   SELECT name, theme_id IS NOT NULL AS wired FROM tenants     WHERE theme IS NOT NULL AND theme <> '{}'::jsonb;
--     -- every reconciled row: wired = t, and so_themes.tokens equals the owner's inline theme
--
-- Then: supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts
--   grep -n "so_themes" packages/database/src/types.ts            -- Row/Insert/Update present
--   grep -n "theme_id" packages/database/src/types.ts             -- theme_id: string | null on tenants + so_clients
