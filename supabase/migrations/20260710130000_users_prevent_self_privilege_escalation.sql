-- ==========================================
-- SECURITY FIX: prevent self privilege-escalation on public.users
-- ==========================================
-- Confirmed hole: the self-UPDATE RLS policy "Users can update own profile"
--   (20250105000001_initial_schema.sql:171-174) is `USING (id = auth.uid()) WITH
--   CHECK (id = auth.uid())` with NO column guard. Any authenticated user can therefore
--   PATCH their own row via PostgREST (own JWT + anon key) and set role='admin' or
--   is_super_admin=true (or move tenant_id), escalating to full access on the next request:
--     - users.role IN ('owner','admin') -> can_access_so_client() grants all clients +
--       getAuthFull() grants ALL_PERMISSION_KEYS.
--     - users.is_super_admin=true -> full cross-tenant bypass.
--
-- FIX: a BEFORE UPDATE trigger that blocks a NON-super *authenticated* caller from changing
--   the three privileged columns (role, is_super_admin, tenant_id) on ANY users row (their
--   own is the only row the self-UPDATE RLS policy lets them reach anyway).
--
-- WHY the trigger is the correct surgical fix (vs a column-level REVOKE/GRANT):
--   The legitimate admin path (createServiceClient, apps/cms/features/users/handlers.server.ts
--   :254-256, 287-296) writes role/is_super_admin via the SERVICE-ROLE client, which has no
--   JWT `sub` -> auth.uid() IS NULL -> this trigger's guard short-circuits (RETURN NEW), so
--   legit writes pass untouched (triggers DO fire for service-role, but the auth.uid() NULL
--   guard is what lets them through). A column-level REVOKE UPDATE(...) FROM authenticated
--   would ALSO block the existing "Super admin can update all users" browser (authenticated)
--   RLS path (20260407100000) — an over-broad narrowing of a legitimate capability. The
--   trigger preserves it: is_super_admin() short-circuits the guard for super_admins.
--   => trigger-only; no column REVOKE (see report for full reasoning).
--
-- Mirrors the so_client_assignment_tenant_guard trigger pattern (20260709120000:125-148):
--   SECURITY DEFINER + SET search_path = '' (all refs fully schema-qualified).
--
-- Correctness invariants (verified against the helper functions before writing):
--   1. auth.uid() IS NULL under service-role (no JWT sub) -> legit admin role-writes bypass.
--   2. is_super_admin() = `SELECT is_super_admin FROM users WHERE id = auth.uid()` (STABLE,
--      SECURITY DEFINER). Inside a BEFORE UPDATE trigger this SELECT reads the COMMITTED
--      (pre-update / OLD) row, so an escalating currently-non-super member is correctly seen
--      as non-super -> blocked; it cannot bootstrap by setting NEW.is_super_admin=true.
--   3. The three IS DISTINCT FROM conditions fire ONLY on the privileged columns, so a
--      non-super self-update of e.g. full_name / google_calendar_token is NOT blocked.
--   4. Supabase Auth (GoTrue) operates on auth.users, not public.users, and runs privileged
--      (auth.uid() NULL) -> never affected by this trigger.

CREATE OR REPLACE FUNCTION public.prevent_users_privilege_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Service-role writes (auth.uid() IS NULL) and super_admins bypass; only a
  -- non-super authenticated caller is blocked from changing privileged columns.
  IF auth.uid() IS NOT NULL
     AND NOT public.is_super_admin()
     AND ( NEW.role          IS DISTINCT FROM OLD.role
        OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
        OR NEW.tenant_id      IS DISTINCT FROM OLD.tenant_id )
  THEN
    RAISE EXCEPTION 'Cannot modify privileged fields (role, is_super_admin, tenant_id) on a user profile';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_users_privilege_self_escalation() IS
  'BEFORE UPDATE guard on public.users: blocks a non-super authenticated caller from changing role/is_super_admin/tenant_id. Service-role (auth.uid() NULL) and super_admins bypass, so legit createServiceClient admin role-writes and the "Super admin can update all users" RLS path are unaffected. Closes the column-unguarded self-UPDATE RLS policy escalation hole.';

DROP TRIGGER IF EXISTS trg_prevent_users_privilege_self_escalation ON public.users;
CREATE TRIGGER trg_prevent_users_privilege_self_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_users_privilege_self_escalation();

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Blocked — non-super authenticated member self-escalating:
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<member-uuid>","role":"authenticated"}';
--   UPDATE public.users SET role = 'admin'        WHERE id = '<member-uuid>'; -- expect: EXCEPTION
--   UPDATE public.users SET is_super_admin = true WHERE id = '<member-uuid>'; -- expect: EXCEPTION
--   UPDATE public.users SET tenant_id = '<other>' WHERE id = '<member-uuid>'; -- expect: EXCEPTION
-- Allowed — same member self-updating a non-privileged column:
--   UPDATE public.users SET full_name = 'X'       WHERE id = '<member-uuid>'; -- expect: OK
--   RESET ROLE;
-- Allowed — legit admin path (service-role, auth.uid() NULL):
--   UPDATE public.users SET role = 'admin'        WHERE id = '<some-user>';   -- expect: OK
