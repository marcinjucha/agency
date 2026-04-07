-- ==========================================
-- Tenant Feature Flags
-- ==========================================
-- Purpose: Per-tenant feature toggle via JSONB enabled_features column
-- Changes:
--   1. Add enabled_features JSONB column to tenants
--   2. Backfill existing tenants with all 8 features
--   3. Add super admin CRUD policy on tenants (UPDATE/INSERT/DELETE)
--   4. Seed system.tenants permission for existing Admin roles
--
-- Verification:
--   1. supabase db reset
--   2. SET ROLE authenticated; SELECT enabled_features FROM tenants;
--   3. npm run db:types
--   4. grep "enabled_features" packages/database/src/types.ts

-- ==========================================
-- 1. Add enabled_features column
-- ==========================================

ALTER TABLE tenants
  ADD COLUMN enabled_features JSONB NOT NULL
  DEFAULT '["dashboard","surveys","intake","calendar","content","shop","workflows","system"]'::jsonb;

COMMENT ON COLUMN tenants.enabled_features IS
  'JSONB array of feature keys enabled for this tenant. Used by CMS sidebar to show/hide navigation items.';

-- ==========================================
-- 2. Backfill existing tenants
-- ==========================================
-- Default applies to new rows only; explicitly set for existing rows

UPDATE tenants
SET enabled_features = '["dashboard","surveys","intake","calendar","content","shop","workflows","system"]'::jsonb
WHERE enabled_features IS NULL;

-- ==========================================
-- 3. RLS — Super admin full CRUD on tenants
-- ==========================================
-- Existing policies (from initial_schema + RBAC):
--   SELECT: "Users can view own tenant or super admin" (already includes super admin)
--   UPDATE: "Users can update own tenant" (own tenant only, no super admin)
--   INSERT: none
--   DELETE: none
--
-- Strategy:
--   - Drop existing UPDATE policy → recreate with super admin support
--   - Add INSERT policy for super admins
--   - Add DELETE policy for super admins

-- Update existing UPDATE policy to include super admin
DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;

CREATE POLICY "Users can update own tenant or super admin"
  ON tenants FOR UPDATE
  USING (id = public.current_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (id = public.current_user_tenant_id() OR public.is_super_admin());

-- Super admin can create tenants
CREATE POLICY "Super admin can insert tenants"
  ON tenants FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Super admin can delete tenants
CREATE POLICY "Super admin can delete tenants"
  ON tenants FOR DELETE
  USING (public.is_super_admin());

-- ==========================================
-- 4. Seed system.tenants permission for existing Admin roles
-- ==========================================
-- Add to Admin roles that already have 'system' parent permission

DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';
  v_admin_role_id UUID;
BEGIN
  -- Find the Admin role for Halo Efekt tenant
  SELECT id INTO v_admin_role_id
  FROM tenant_roles
  WHERE tenant_id = v_tenant_id AND name = 'Admin';

  -- Add system.tenants permission (skip if already exists)
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (v_admin_role_id, 'system.tenants')
    ON CONFLICT (role_id, permission_key) DO NOTHING;
  END IF;
END $$;
