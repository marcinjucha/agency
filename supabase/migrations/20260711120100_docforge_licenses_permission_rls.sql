-- ==========================================
-- DocForge licenses: grant management via 'system.docforge_licenses' permission
-- ==========================================
-- Branch A: any authenticated user holding the 'system.docforge_licenses' permission
--   key sees and manages ALL DocForge licenses/activations. No operator-tenant restriction
--   (DocForge licenses have no tenant_id — the tables are cross-tenant by design).
--
-- Replaces the super-admin-only policies from
--   20260408120000_docforge_licenses_seats_activations.sql:53-61.
--   current_user_has_permission() OR's is_super_admin() internally, so existing
--   super admins keep full access.
--
-- Tables affected: docforge_licenses, docforge_activations.
--   (There is NO docforge_license_seats table — seat counts live in
--    docforge_licenses.max_seats + the docforge_activations rows.)
--
-- Verification:
--   1. supabase db reset
--   2. SET ROLE authenticated; SET request.jwt.claims = '{"sub":"<user-with-key>"}';
--      SELECT * FROM docforge_licenses;   -- rows visible
--   3. SET request.jwt.claims = '{"sub":"<user-without-key>"}';
--      SELECT * FROM docforge_licenses;   -- zero rows
--   4. Super admin still sees all rows.

-- docforge_licenses
DROP POLICY IF EXISTS "Super admin full access" ON docforge_licenses;

CREATE POLICY "Permissioned or super admin"
  ON docforge_licenses FOR ALL
  USING (public.current_user_has_permission('system.docforge_licenses'))
  WITH CHECK (public.current_user_has_permission('system.docforge_licenses'));

-- docforge_activations
DROP POLICY IF EXISTS "Super admin full access" ON docforge_activations;

CREATE POLICY "Permissioned or super admin"
  ON docforge_activations FOR ALL
  USING (public.current_user_has_permission('system.docforge_licenses'))
  WITH CHECK (public.current_user_has_permission('system.docforge_licenses'));
