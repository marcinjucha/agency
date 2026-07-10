-- ==========================================
-- Venture Bonus Funnel — row-level per-user client scoping (Iteration 1 of 5)
-- ==========================================
-- Purpose: layer a NEW row-level ownership axis UNDER tenant isolation. A tenant admin
--   assigns specific so_clients to a specific (internal) user; that scoped user then
--   sees/edits ONLY assigned clients and, transitively, their so_campaigns / so_bonuses /
--   so_leads / so_esp_sync_log. Owner / admin / super_admin remain unscoped.
--
-- This does NOT rebuild the existing tenant RBAC — it composes with it. Every edited
-- authenticated policy keeps its original tenant / is_super_admin conditions and gains an
-- ADDITIONAL `AND can_access_so_client(...)` conjunct (narrows, never widens).
--
-- Recursion safety: can_access_so_client() is SECURITY DEFINER + STABLE with an empty
--   search_path. Being SECURITY DEFINER it BYPASSES RLS on the tables it reads
--   (so_clients, so_client_assignments) — so referencing so_clients from inside a
--   so_clients policy via this helper does NOT re-enter the so_clients policy. No cycle.
--
-- Scope of edits: ONLY `TO authenticated` policies change. Every `TO anon` policy and the
--   anon column GRANTs from 20260705120000 are left untouched — public published-campaign /
--   published-bonus visibility is unchanged by this migration.

-- ==========================================
-- SECTION 1: so_client_assignments (the row-level ownership map)
-- ==========================================
-- FK -> users(id) is for INTERNAL-user scope ONLY. An external client-portal actor
-- (a creator logging in to see just their own funnel) is NOT solved by this schema — that
-- needs a separate actor / auth boundary and is deferred to a later iteration.
CREATE TABLE IF NOT EXISTS so_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES so_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_so_client_assignments_user ON so_client_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_so_client_assignments_client ON so_client_assignments(client_id);

ALTER TABLE so_client_assignments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 2: can_access_so_client() — the single scoping predicate
-- ==========================================
-- SECURITY DEFINER + SET search_path = '' (mandatory hardening — every reference is
--   fully schema-qualified: public.* for our tables/helpers, auth.uid() for the JWT subject).
-- SELF-SCOPING: the helper itself gates on cl.tenant_id = current_user_tenant_id(); callers
--   MUST NOT rely on a separate tenant conjunct for correctness (they keep theirs for
--   defence-in-depth, but this function is safe on its own).
-- Role list ('owner','admin') MUST stay in parity with the canonical unscoped-role
--   set UNSCOPED_ROLES in apps/cms/lib/roles.ts (['owner','admin']); server-auth's
--   FULL_ACCESS_ROLES and client-access.ts's UNSCOPED_ROLE_NAMES both alias it.
CREATE OR REPLACE FUNCTION public.can_access_so_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- super_admin short-circuits ABOVE the tenant gate: they are deliberately UNSCOPED
  -- cross-tenant on the venture data tables (parity with 20260705120000, migration header,
  -- and the Scope Bar — current_user_tenant_id() reads the super_admin's HOME tenant, so a
  -- tenant-gated super_admin could never view another tenant's venture data).
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.so_clients cl
      WHERE cl.id = p_client_id
        AND cl.tenant_id = public.current_user_tenant_id()
        AND (
          public.current_user_role() IN ('owner', 'admin')
          OR EXISTS (
            SELECT 1
            FROM public.so_client_assignments a
            WHERE a.client_id = p_client_id
              AND a.user_id = auth.uid()
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_so_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_access_so_client(uuid) IS
  'Row-level per-user client scoping for the venture bonus-funnel. super_admin short-circuits TRUE (unscoped cross-tenant, by design). Otherwise self-scoping: false unless the client tenant matches the caller tenant; then true for owner/admin, or when an explicit so_client_assignments row exists for auth.uid(). SECURITY DEFINER (bypasses RLS -> no recursion). Role list must match the canonical UNSCOPED_ROLES in apps/cms/lib/roles.ts (aliased by server-auth FULL_ACCESS_ROLES + client-access UNSCOPED_ROLE_NAMES).';

-- ==========================================
-- SECTION 2b: so_client_in_current_tenant() — tenant-scope predicate for assignment policies
-- ==========================================
-- SECURITY DEFINER helper (bypasses RLS) that answers "does this client belong to the
--   caller's tenant?". Used to tenant-scope the owner/admin branch of the
--   so_client_assignments policies WITHOUT triggering RLS recursion: inlining
--   `EXISTS (SELECT 1 FROM so_clients ...)` in those policies would re-enter the so_clients
--   RLS policy (which calls can_access_so_client()); this helper reads so_clients with RLS
--   bypassed, so there is no cycle. Deliberately does NOT check role or assignment — pure
--   tenant membership of the client, nothing else.
CREATE OR REPLACE FUNCTION public.so_client_in_current_tenant(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.so_clients cl
    WHERE cl.id = p_client_id
      AND cl.tenant_id = public.current_user_tenant_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.so_client_in_current_tenant(uuid) TO authenticated;

COMMENT ON FUNCTION public.so_client_in_current_tenant(uuid) IS
  'True iff the given so_client belongs to the caller''s current tenant. SECURITY DEFINER (bypasses RLS) so it can tenant-scope so_client_assignments policies without re-entering so_clients RLS. Pure tenant-membership check — NO role/assignment logic (do NOT use to gate writes on access; writes gate on role separately).';

-- ==========================================
-- SECTION 2c: tenant-consistency trigger for so_client_assignments (defense-in-depth)
-- ==========================================
-- Hard guarantee that an assignment row pairs a user and a client from the SAME tenant.
-- Issue-1's INSERT tenant-scoping still lets an owner/admin pair one of THEIR clients with a
-- user_id from another tenant; read-time neutralization (helper tenant gate) would render it
-- inert, but this trigger makes such a row impossible to create/update at all.
-- SECURITY DEFINER so it reads users/so_clients with RLS bypassed (true tenant_ids, never
-- masked to NULL by the caller's own RLS). The backfill INSERT pairs same-tenant user+client
-- by construction, so it passes cleanly.
CREATE OR REPLACE FUNCTION public.so_client_assignment_tenant_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_tenant uuid;
  v_client_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_user_tenant FROM public.users WHERE id = NEW.user_id;
  SELECT tenant_id INTO v_client_tenant FROM public.so_clients WHERE id = NEW.client_id;
  IF v_user_tenant IS DISTINCT FROM v_client_tenant THEN
    RAISE EXCEPTION 'so_client_assignments: user % (tenant %) and client % (tenant %) must belong to the same tenant',
      NEW.user_id, v_user_tenant, NEW.client_id, v_client_tenant;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_so_client_assignment_tenant_guard ON so_client_assignments;
CREATE TRIGGER trg_so_client_assignment_tenant_guard
  BEFORE INSERT OR UPDATE ON so_client_assignments
  FOR EACH ROW EXECUTE FUNCTION public.so_client_assignment_tenant_guard();

-- ==========================================
-- SECTION 3: so_client_assignments RLS policies
-- ==========================================
-- Manage (INSERT/DELETE): ONLY owner/admin of the client's OWN tenant, or super_admin
--   (unscoped). Tenant-scoped via so_client_in_current_tenant() so an owner/admin of tenant A
--   cannot read/insert/delete tenant B's assignment rows. Deliberately NOT gated on
--   can_access_so_client(): that returns TRUE for an ASSIGNED scoped member, which would let a
--   scoped member manage OTHER users' assignments to a client they can access — a privilege
--   escalation. Writes require role IN ('owner','admin') (tenant-scoped) or super_admin; a
--   scoped member must not be able to grant themselves (or anyone) access.
DROP POLICY IF EXISTS "Admins can insert so_client_assignments" ON so_client_assignments;
CREATE POLICY "Admins can insert so_client_assignments"
  ON so_client_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() IN ('owner', 'admin')
      AND public.so_client_in_current_tenant(client_id)
    )
  );

DROP POLICY IF EXISTS "Admins can delete so_client_assignments" ON so_client_assignments;
CREATE POLICY "Admins can delete so_client_assignments"
  ON so_client_assignments FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() IN ('owner', 'admin')
      AND public.so_client_in_current_tenant(client_id)
    )
  );

-- Read: own assignments only (any authenticated user sees their own rows), plus owner/admin
--   of the SAME tenant as the row's client (tenant-scoped — cannot enumerate tenant B's map),
--   plus super_admin (unscoped).
DROP POLICY IF EXISTS "Users can view relevant so_client_assignments" ON so_client_assignments;
CREATE POLICY "Users can view relevant so_client_assignments"
  ON so_client_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR (
      public.current_user_role() IN ('owner', 'admin')
      AND public.so_client_in_current_tenant(client_id)
    )
  );

-- No anon policy on this table (RLS enabled + no anon policy => anon denied).

-- ==========================================
-- SECTION 4: so_clients — edit authenticated policies IN PLACE (drop + recreate)
-- ==========================================
-- SELECT / UPDATE: existing (tenant OR super_admin) AND can_access_so_client(id) — an
--   assigned scoped member CAN view and edit their client (member enters sensitive config).
-- DELETE: UNSCOPED-only (mirrors INSERT gate) — owner/admin of the client's tenant, or
--   super_admin. A scoped member must NOT delete a client (delete cascades to
--   campaigns/bonuses/leads → admin-only). can_access_so_client(id) is deliberately NOT a
--   conjunct here: it returns TRUE for an assigned member, which would let a member delete
--   their assigned client. owner/admin still pass via the role branch (no legitimate delete lost).
DROP POLICY IF EXISTS "Tenant users can view so_clients" ON so_clients;
CREATE POLICY "Tenant users can view so_clients"
  ON so_clients FOR SELECT
  TO authenticated
  USING (
    (tenant_id = public.current_user_tenant_id() OR public.is_super_admin())
    AND public.can_access_so_client(id)
  );

DROP POLICY IF EXISTS "Tenant users can update so_clients" ON so_clients;
CREATE POLICY "Tenant users can update so_clients"
  ON so_clients FOR UPDATE
  TO authenticated
  USING (
    (tenant_id = public.current_user_tenant_id() OR public.is_super_admin())
    AND public.can_access_so_client(id)
  )
  WITH CHECK (
    (tenant_id = public.current_user_tenant_id() OR public.is_super_admin())
    AND public.can_access_so_client(id)
  );

DROP POLICY IF EXISTS "Tenant users can delete so_clients" ON so_clients;
CREATE POLICY "Tenant users can delete so_clients"
  ON so_clients FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('owner', 'admin'))
    OR public.is_super_admin()
  );

-- INSERT: client creation stays UNSCOPED-only. can_access_so_client(id) is nonsensical here
--   (the row does not exist yet), so it is NOT appended. Instead the INSERT is tightened to
--   require owner/admin (or super_admin) — a scoped member cannot create clients.
DROP POLICY IF EXISTS "Tenant users can insert so_clients" ON so_clients;
CREATE POLICY "Tenant users can insert so_clients"
  ON so_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('owner', 'admin'))
    OR public.is_super_admin()
  );

-- ==========================================
-- SECTION 5: so_campaigns — edit authenticated policies IN PLACE (client-id expr = client_id)
-- ==========================================
DROP POLICY IF EXISTS "Tenant users can view so_campaigns" ON so_campaigns;
CREATE POLICY "Tenant users can view so_campaigns"
  ON so_campaigns FOR SELECT
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_clients cl
        WHERE cl.id = so_campaigns.client_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(so_campaigns.client_id)
  );

DROP POLICY IF EXISTS "Tenant users can insert so_campaigns" ON so_campaigns;
CREATE POLICY "Tenant users can insert so_campaigns"
  ON so_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_clients cl
        WHERE cl.id = so_campaigns.client_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(so_campaigns.client_id)
  );

DROP POLICY IF EXISTS "Tenant users can update so_campaigns" ON so_campaigns;
CREATE POLICY "Tenant users can update so_campaigns"
  ON so_campaigns FOR UPDATE
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_clients cl
        WHERE cl.id = so_campaigns.client_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(so_campaigns.client_id)
  )
  WITH CHECK (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_clients cl
        WHERE cl.id = so_campaigns.client_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(so_campaigns.client_id)
  );

DROP POLICY IF EXISTS "Tenant users can delete so_campaigns" ON so_campaigns;
CREATE POLICY "Tenant users can delete so_campaigns"
  ON so_campaigns FOR DELETE
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_clients cl
        WHERE cl.id = so_campaigns.client_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(so_campaigns.client_id)
  );

-- ==========================================
-- SECTION 6: so_bonuses — client resolved via campaign_id -> so_campaigns.client_id
-- ==========================================
DROP POLICY IF EXISTS "Tenant users can view so_bonuses" ON so_bonuses;
CREATE POLICY "Tenant users can view so_bonuses"
  ON so_bonuses FOR SELECT
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_bonuses.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_bonuses.campaign_id)
    )
  );

DROP POLICY IF EXISTS "Tenant users can insert so_bonuses" ON so_bonuses;
CREATE POLICY "Tenant users can insert so_bonuses"
  ON so_bonuses FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_bonuses.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_bonuses.campaign_id)
    )
  );

DROP POLICY IF EXISTS "Tenant users can update so_bonuses" ON so_bonuses;
CREATE POLICY "Tenant users can update so_bonuses"
  ON so_bonuses FOR UPDATE
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_bonuses.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_bonuses.campaign_id)
    )
  )
  WITH CHECK (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_bonuses.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_bonuses.campaign_id)
    )
  );

DROP POLICY IF EXISTS "Tenant users can delete so_bonuses" ON so_bonuses;
CREATE POLICY "Tenant users can delete so_bonuses"
  ON so_bonuses FOR DELETE
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_bonuses.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_bonuses.campaign_id)
    )
  );

-- ==========================================
-- SECTION 7: so_leads — client resolved via campaign_id -> so_campaigns.client_id
-- ==========================================
-- Only the authenticated SELECT policy exists (writes are service-role; no auth
-- INSERT/UPDATE/DELETE policy by design). Append the scope conjunct to SELECT only.
DROP POLICY IF EXISTS "Tenant users can view so_leads" ON so_leads;
CREATE POLICY "Tenant users can view so_leads"
  ON so_leads FOR SELECT
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_campaigns ca
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE ca.id = so_leads.campaign_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (SELECT ca.client_id FROM so_campaigns ca WHERE ca.id = so_leads.campaign_id)
    )
  );

-- ==========================================
-- SECTION 8: so_esp_sync_log — client resolved via lead_id -> so_leads -> so_campaigns.client_id
-- ==========================================
-- NOTE: so_esp_sync_log has NO campaign_id column — it links to so_leads(lead_id), and
-- so_leads links to so_campaigns(campaign_id). The FK chain is lead_id -> campaign_id -> client_id.
DROP POLICY IF EXISTS "Tenant users can view so_esp_sync_log" ON so_esp_sync_log;
CREATE POLICY "Tenant users can view so_esp_sync_log"
  ON so_esp_sync_log FOR SELECT
  TO authenticated
  USING (
    (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM so_leads l
        JOIN so_campaigns ca ON ca.id = l.campaign_id
        JOIN so_clients cl ON cl.id = ca.client_id
        WHERE l.id = so_esp_sync_log.lead_id
          AND cl.tenant_id = public.current_user_tenant_id()
      )
    )
    AND public.can_access_so_client(
      (
        SELECT ca.client_id
        FROM so_campaigns ca
        JOIN so_leads l ON l.campaign_id = ca.id
        WHERE l.id = so_esp_sync_log.lead_id
      )
    )
  );

-- ==========================================
-- SECTION 9: DATA BACKFILL (zero access-cliff)
-- ==========================================
-- Every EXISTING scoped member (role is neither owner nor admin — including NULL role —
-- and NOT super_admin) gets an explicit assignment to ALL so_clients in their tenant, so
-- everyone who could read a client BEFORE this migration can still read it AFTER.
-- Owner / admin / super_admin need NO rows (access flows through the role branch of
-- can_access_so_client). Idempotent via ON CONFLICT.
INSERT INTO so_client_assignments (user_id, client_id)
SELECT u.id, c.id
FROM users u
JOIN so_clients c ON c.tenant_id = u.tenant_id
WHERE u.role IS DISTINCT FROM 'owner'
  AND u.role IS DISTINCT FROM 'admin'
  AND u.is_super_admin = false
ON CONFLICT (user_id, client_id) DO NOTHING;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Anon regression (must be UNCHANGED — this migration touched only authenticated policies):
--   SET ROLE anon; SELECT count(*) FROM so_campaigns; SELECT count(*) FROM so_bonuses; RESET ROLE;
-- Scoped member with 1 assignment sees only that client's rows across all 5 tables:
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<scoped-user-uuid>","role":"authenticated"}';
--   SELECT count(*) FROM so_clients; -- expect: number of assigned clients only
-- Scoped member with 0 assignments sees 0 venture rows across all 5 tables.
-- Scoped member cannot self-assign:
--   INSERT INTO so_client_assignments(user_id, client_id) VALUES (auth.uid(), '<client>'); -- expect RLS denial
-- Owner sees all tenant clients (role branch).
