-- ==========================================
-- Super admin cross-tenant access for users table
-- ==========================================
-- Problem: Super admin cannot view users from other tenants via browser client.
-- Existing SELECT policies only allow own profile + same tenant.
-- This adds super admin bypass for SELECT on users table.

CREATE POLICY "Super admin can view all users"
  ON users FOR SELECT
  USING (public.is_super_admin());

-- Also add UPDATE for super admin (needed for role changes cross-tenant)
CREATE POLICY "Super admin can update all users"
  ON users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Also add DELETE for super admin (cascade delete when removing tenant)
CREATE POLICY "Super admin can delete all users"
  ON users FOR DELETE
  USING (public.is_super_admin());

-- Also add INSERT for super admin (creating users in other tenants)
CREATE POLICY "Super admin can insert users"
  ON users FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Same policies needed for user_roles and tenant_roles (cross-tenant management)
CREATE POLICY "Super admin can view all user_roles"
  ON user_roles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin can manage all user_roles"
  ON user_roles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can view all tenant_roles"
  ON tenant_roles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin can manage all tenant_roles"
  ON tenant_roles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can view all role_permissions"
  ON role_permissions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin can manage all role_permissions"
  ON role_permissions FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
