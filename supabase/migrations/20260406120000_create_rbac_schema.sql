-- ==========================================
-- RBAC (Role-Based Access Control) Schema
-- ==========================================
-- Purpose: Tenant-scoped roles and permissions system
-- Tables: tenant_roles, role_permissions, user_roles
-- Functions: is_super_admin()
-- Pattern: current_user_tenant_id() for RLS (no subqueries)
--
-- Verification:
--   1. supabase db reset
--   2. SET ROLE authenticated; SET request.jwt.claims = '{"sub":"..."}'; SELECT * FROM tenant_roles;
--   3. npm run db:types
--   4. grep "tenant_roles" packages/database/src/types.ts

-- ==========================================
-- 1. Add is_super_admin to users table
-- ==========================================

ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- ==========================================
-- 2. Create is_super_admin() helper function
-- ==========================================
-- SECURITY DEFINER: bypasses users table RLS to check flag
-- STABLE: cached per transaction (same as current_user_tenant_id)

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true if current user is a super admin. SECURITY DEFINER bypasses users RLS. Used in RLS policies for cross-tenant access.';

-- ==========================================
-- 3. Create tenant_roles table
-- ==========================================

CREATE TABLE tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tenant_roles_tenant_id ON tenant_roles(tenant_id);

CREATE TRIGGER set_updated_at_tenant_roles
  BEFORE UPDATE ON tenant_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 4. Create role_permissions table
-- ==========================================

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  UNIQUE(role_id, permission_key)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- ==========================================
-- 5. Create user_roles table
-- ==========================================
-- ON DELETE RESTRICT for role_id: cannot delete a role that has users assigned

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- ==========================================
-- 6. RLS Policies — tenant_roles
-- ==========================================

ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant roles or super admin"
  ON tenant_roles FOR SELECT
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Users can insert own tenant roles"
  ON tenant_roles FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant roles"
  ON tenant_roles FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can delete own tenant roles"
  ON tenant_roles FOR DELETE
  USING (tenant_id = public.current_user_tenant_id());

-- ==========================================
-- 7. RLS Policies — role_permissions
-- ==========================================

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant role permissions or super admin"
  ON role_permissions FOR SELECT
  USING (
    role_id IN (SELECT id FROM tenant_roles WHERE tenant_id = public.current_user_tenant_id())
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert own tenant role permissions"
  ON role_permissions FOR INSERT
  WITH CHECK (
    role_id IN (SELECT id FROM tenant_roles WHERE tenant_id = public.current_user_tenant_id())
  );

CREATE POLICY "Users can update own tenant role permissions"
  ON role_permissions FOR UPDATE
  USING (
    role_id IN (SELECT id FROM tenant_roles WHERE tenant_id = public.current_user_tenant_id())
  )
  WITH CHECK (
    role_id IN (SELECT id FROM tenant_roles WHERE tenant_id = public.current_user_tenant_id())
  );

CREATE POLICY "Users can delete own tenant role permissions"
  ON role_permissions FOR DELETE
  USING (
    role_id IN (SELECT id FROM tenant_roles WHERE tenant_id = public.current_user_tenant_id())
  );

-- ==========================================
-- 8. RLS Policies — user_roles
-- ==========================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant user roles or super admin"
  ON user_roles FOR SELECT
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Users can insert own tenant user roles"
  ON user_roles FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant user roles"
  ON user_roles FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can delete own tenant user roles"
  ON user_roles FOR DELETE
  USING (tenant_id = public.current_user_tenant_id());

-- ==========================================
-- 9. Update tenants SELECT policy for super admin
-- ==========================================
-- Existing policy: "Users can view own tenant" — add OR is_super_admin()

DROP POLICY "Users can view own tenant" ON tenants;

CREATE POLICY "Users can view own tenant or super admin"
  ON tenants FOR SELECT
  USING (id = public.current_user_tenant_id() OR public.is_super_admin());

-- ==========================================
-- 10. Seed data for existing Halo Efekt tenant
-- ==========================================

DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';
  v_admin_role_id UUID;
  v_member_role_id UUID;
BEGIN
  -- Create Admin role (all permissions)
  INSERT INTO tenant_roles (tenant_id, name, description, is_default)
  VALUES (v_tenant_id, 'Admin', 'Full access to all features', false)
  RETURNING id INTO v_admin_role_id;

  -- Create Member role (default for new users)
  INSERT INTO tenant_roles (tenant_id, name, description, is_default)
  VALUES (v_tenant_id, 'Member', 'Standard team member access', true)
  RETURNING id INTO v_member_role_id;

  -- Admin permissions (all)
  INSERT INTO role_permissions (role_id, permission_key) VALUES
    (v_admin_role_id, 'dashboard'),
    (v_admin_role_id, 'surveys'),
    (v_admin_role_id, 'intake'),
    (v_admin_role_id, 'calendar'),
    (v_admin_role_id, 'content'),
    (v_admin_role_id, 'content.landing_page'),
    (v_admin_role_id, 'content.blog'),
    (v_admin_role_id, 'content.media'),
    (v_admin_role_id, 'content.legal_pages'),
    (v_admin_role_id, 'shop'),
    (v_admin_role_id, 'shop.products'),
    (v_admin_role_id, 'shop.categories'),
    (v_admin_role_id, 'shop.marketplace'),
    (v_admin_role_id, 'workflows'),
    (v_admin_role_id, 'workflows.executions'),
    (v_admin_role_id, 'system'),
    (v_admin_role_id, 'system.email_templates'),
    (v_admin_role_id, 'system.settings'),
    (v_admin_role_id, 'system.users'),
    (v_admin_role_id, 'system.roles');

  -- Member permissions (subset)
  INSERT INTO role_permissions (role_id, permission_key) VALUES
    (v_member_role_id, 'dashboard'),
    (v_member_role_id, 'surveys'),
    (v_member_role_id, 'intake'),
    (v_member_role_id, 'calendar'),
    (v_member_role_id, 'content.blog'),
    (v_member_role_id, 'workflows'),
    (v_member_role_id, 'workflows.executions');

  -- Assign all existing users in this tenant to Admin role
  INSERT INTO user_roles (user_id, tenant_id, role_id)
  SELECT id, tenant_id, v_admin_role_id
  FROM users
  WHERE tenant_id = v_tenant_id;

  -- Set owner user as super admin
  UPDATE users
  SET is_super_admin = true
  WHERE tenant_id = v_tenant_id AND role = 'owner';

END $$;
