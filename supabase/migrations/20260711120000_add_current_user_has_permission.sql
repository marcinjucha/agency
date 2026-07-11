-- ==========================================
-- current_user_has_permission(p_key) helper
-- ==========================================
-- Purpose: RLS-safe permission check for the RBAC system, mirroring is_super_admin().
--   Returns true when the current user (auth.uid()) may act under permission key p_key.
--
-- Grant sources (any one grants):
--   1. Super admin        — public.is_super_admin() (cross-tenant, bypasses everything)
--   2. Unscoped actors    — legacy users.role IN ('owner','admin') get ALL keys (app-layer convention)
--   3. Explicit RBAC key  — user_roles → role_permissions holds the exact key,
--                            OR the parent group key (split_part(p_key, '.', 1)),
--                            matching the app-layer expandPermissionKeys behaviour
--                            (a 'system' grant implies 'system.docforge_licenses').
--
-- Recursion-safe: SECURITY DEFINER bypasses RLS on users / user_roles / role_permissions,
--   exactly like is_super_admin() (20260406120000_create_rbac_schema.sql:27-38). Never queried
--   inside its own tables' policies, so no infinite-recursion risk.
--
-- CAVEAT (parity with app-layer hasPermission): the parent-group match uses split_part(p_key,'.',1),
--   which only covers a ONE-LEVEL parent (root segment, e.g. 'system' ⊃ 'system.docforge_licenses').
--   The app-layer hasPermission uses startsWith and covers any ancestor. Identical for the ≤2-segment
--   key space in use today; if a 3-level permission key ('a.b.c') is ever introduced, revisit this so
--   the DB read gate and code write gate keep admitting the same user set.
--
-- Verification:
--   1. supabase db reset
--   2. SET ROLE authenticated; SET request.jwt.claims = '{"sub":"<user-id>"}';
--      SELECT public.current_user_has_permission('system.docforge_licenses');
--   3. Confirm a member holding role_permissions.permission_key = 'system.docforge_licenses' → true
--   4. Confirm an owner/admin (users.role) → true; a bare member without the key → false

CREATE OR REPLACE FUNCTION public.current_user_has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin')
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND (rp.permission_key = p_key OR rp.permission_key = split_part(p_key, '.', 1))
    );
$$;

COMMENT ON FUNCTION public.current_user_has_permission(text) IS
  'Returns true if the current user may act under permission key p_key. Mirrors is_super_admin() for the RBAC permission system: super admins and legacy owner/admin roles get all keys; other users match via user_roles → role_permissions (exact key or its parent group key). SECURITY DEFINER makes it recursion-safe in RLS policies.';

GRANT EXECUTE ON FUNCTION public.current_user_has_permission(text) TO authenticated;
