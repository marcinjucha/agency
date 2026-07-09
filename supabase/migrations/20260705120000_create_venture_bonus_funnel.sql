-- ==========================================
-- Venture Bonus Funnel — schema foundation (Iteration 1)
-- ==========================================
-- Purpose: 5 so_* tables for the creator bonus-funnel feature + RLS + feature-flag enable.
--   Hierarchy: tenants -> so_clients -> so_campaigns -> so_bonuses / so_leads -> so_esp_sync_log
-- Scope: DB-only. NO endpoints/ESP providers/UI (later iterations).
--
-- RLS model (see per-table sections):
--   - Public (anon): SELECT published campaigns + published bonuses of published campaigns. NO anon on so_clients.
--   - Tenant (authenticated, TO authenticated ONLY): full CRUD scoped to caller's tenant via the FK chain,
--     using current_user_tenant_id() (SECURITY DEFINER helper — no recursion) + EXISTS to parent tables.
--     is_super_admin() bypass.
--   - so_leads / so_esp_sync_log: ZERO anon/PUBLIC policy (RLS-enabled + no matching policy = deny-all for anon).
--     Writes happen via service-role (bypasses RLS). Authenticated read scoped to owning tenant OR is_super_admin().
--
-- Recursion safety: every EXISTS references a PARENT table only; parent policies terminate on
--   current_user_tenant_id()/is_super_admin() (SECURITY DEFINER, bypass RLS) or a plain column check.
--   No child->parent->child cycle => no infinite recursion (contrast the Phase-2 surveys->users->users crash).
--
-- Verification (runnable — see bottom of file).

-- ==========================================
-- SECTION 1: so_clients (creator/client entity, e.g. Kacper)
-- ==========================================

CREATE TABLE IF NOT EXISTS so_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_so_clients_tenant ON so_clients(tenant_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON so_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE so_clients ENABLE ROW LEVEL SECURITY;

-- Tenant management (authenticated only — NO anon)
CREATE POLICY "Tenant users can view so_clients"
  ON so_clients FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can insert so_clients"
  ON so_clients FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can update so_clients"
  ON so_clients FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Tenant users can delete so_clients"
  ON so_clients FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id() OR public.is_super_admin());

-- ==========================================
-- SECTION 2: so_campaigns
-- ==========================================

CREATE TABLE IF NOT EXISTS so_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES so_clients(id) ON DELETE CASCADE,
  -- GLOBAL uniqueness is intentional (spec §7): the public URL `/c/{slug}` carries no tenant context,
  -- so slugs must be globally unambiguous. Contrast so_clients above, which is per-tenant UNIQUE(tenant_id, slug).
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT,
  brand JSONB,
  esp_provider TEXT NOT NULL DEFAULT 'beehiiv',
  -- beehiiv publication_id; provider-neutral audience reference for this campaign. Nullable.
  esp_audience_ref TEXT,
  esp_tag_launch TEXT NOT NULL DEFAULT 'launch-notify',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_campaigns_client ON so_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_so_campaigns_slug ON so_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_so_campaigns_published ON so_campaigns(published) WHERE published = true;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON so_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE so_campaigns ENABLE ROW LEVEL SECURITY;

-- Public read: anon sees published campaigns only
CREATE POLICY "Anyone can view published so_campaigns"
  ON so_campaigns FOR SELECT
  TO anon
  USING (published = true);

-- Tenant management (authenticated) — scoped via parent so_clients.tenant_id (EXISTS to parent, acyclic)
CREATE POLICY "Tenant users can view so_campaigns"
  ON so_campaigns FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_clients cl
      WHERE cl.id = so_campaigns.client_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can insert so_campaigns"
  ON so_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_clients cl
      WHERE cl.id = so_campaigns.client_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can update so_campaigns"
  ON so_campaigns FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_clients cl
      WHERE cl.id = so_campaigns.client_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_clients cl
      WHERE cl.id = so_campaigns.client_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can delete so_campaigns"
  ON so_campaigns FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_clients cl
      WHERE cl.id = so_campaigns.client_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

-- Column-level anon exposure hardening (RLS restricts ROWS, not COLUMNS).
-- The anon row policy above scopes anon to published rows, but without a column GRANT anon
-- would see ALL columns — including internal ESP wiring (esp_provider/esp_audience_ref/
-- esp_tag_launch) and client_id/timestamps. Restrict the anon SELECT grant to the public-safe
-- columns only. `published` MUST stay granted: the so_bonuses anon policy's EXISTS subquery
-- reads so_campaigns.id + so_campaigns.published under the anon role — dropping either would
-- break public bonus visibility.
REVOKE SELECT ON so_campaigns FROM anon;
GRANT SELECT (id, slug, display_name, brand, published) ON so_campaigns TO anon;

-- ==========================================
-- SECTION 3: so_bonuses
-- ==========================================

CREATE TABLE IF NOT EXISTS so_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES so_campaigns(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  type TEXT CHECK (type IN ('link', 'file')),
  url TEXT,
  media_asset_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_bonuses_campaign ON so_bonuses(campaign_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_so_bonuses_media_asset ON so_bonuses(media_asset_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON so_bonuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE so_bonuses ENABLE ROW LEVEL SECURITY;

-- Public read: anon sees published bonuses whose parent campaign is also published.
-- EXISTS to parent so_campaigns with explicit c.published = true (does not depend on nested RLS). Acyclic.
CREATE POLICY "Anyone can view published so_bonuses"
  ON so_bonuses FOR SELECT
  TO anon
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM so_campaigns c
      WHERE c.id = so_bonuses.campaign_id
        AND c.published = true
    )
  );

-- Tenant management (authenticated) — scoped via campaign -> client -> tenant_id
CREATE POLICY "Tenant users can view so_bonuses"
  ON so_bonuses FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_bonuses.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can insert so_bonuses"
  ON so_bonuses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_bonuses.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can update so_bonuses"
  ON so_bonuses FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_bonuses.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_bonuses.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY "Tenant users can delete so_bonuses"
  ON so_bonuses FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_bonuses.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

-- ==========================================
-- SECTION 4: so_leads (ISOLATION-CRITICAL — zero anon access)
-- ==========================================

CREATE TABLE IF NOT EXISTS so_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES so_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,
  consent_launch BOOLEAN NOT NULL DEFAULT false,
  legal_basis_bonus TEXT NOT NULL DEFAULT 'art6-1-b',
  tally_submission_id TEXT UNIQUE,
  esp_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_leads_campaign ON so_leads(campaign_id);
-- tally_submission_id already UNIQUE (implicit unique index).

ALTER TABLE so_leads ENABLE ROW LEVEL SECURITY;

-- NO anon / PUBLIC policy on purpose. RLS enabled + no matching policy for anon => anon reads/writes DENIED.
-- Public writes (Tally webhook / ESP sync) go through the service-role client, which bypasses RLS.

-- DEFERRED DECISION: lead erasure (GDPR art.17 right-to-erasure) is service-role-only BY DESIGN.
-- There is intentionally NO authenticated DELETE policy here — erasure runs through the service-role
-- client (bypasses RLS) in a dedicated endpoint. Revisit ONLY if operator-initiated erasure from the
-- CMS UI becomes a requirement; that decision is deferred to the erasure-endpoint iteration.

-- Authenticated read ONLY, scoped to owning tenant via campaign -> client -> tenant_id, or super admin.
CREATE POLICY "Tenant users can view so_leads"
  ON so_leads FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_campaigns ca
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE ca.id = so_leads.campaign_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

-- ==========================================
-- SECTION 5: so_esp_sync_log (ISOLATION-CRITICAL — zero anon access)
-- ==========================================

CREATE TABLE IF NOT EXISTS so_esp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES so_leads(id) ON DELETE CASCADE,
  provider TEXT,
  -- free TEXT (no CHECK). Value set: 'upsert_contact' | 'subscribe' | 'add_tag' (beehiiv).
  action TEXT,
  status TEXT,
  error TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_esp_sync_log_lead ON so_esp_sync_log(lead_id);

ALTER TABLE so_esp_sync_log ENABLE ROW LEVEL SECURITY;

-- NO anon / PUBLIC policy. Writes via service-role only.
-- Authenticated read scoped via lead -> campaign -> client -> tenant_id, or super admin.
CREATE POLICY "Tenant users can view so_esp_sync_log"
  ON so_esp_sync_log FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM so_leads l
      JOIN so_campaigns ca ON ca.id = l.campaign_id
      JOIN so_clients cl ON cl.id = ca.client_id
      WHERE l.id = so_esp_sync_log.lead_id
        AND cl.tenant_id = public.current_user_tenant_id()
    )
  );

-- ==========================================
-- SECTION 6: Feature flag — enable bonus_funnel for Halo Efekt tenant
-- ==========================================
-- The feature KEY registry (parent 'bonus_funnel' + children clients/campaigns/bonuses) is defined
-- code-side in apps/cms/lib/permissions.ts (PERMISSION_GROUPS). This block enables it for the existing
-- Halo Efekt tenant, mirroring migration 20260407000000 + the runtime syncFeaturePermissions path.

-- 6a. Append 'bonus_funnel' to tenants.enabled_features (idempotent — skip if already present)
UPDATE tenants
SET enabled_features = COALESCE(enabled_features, '[]'::jsonb) || '["bonus_funnel"]'::jsonb
WHERE id = '19342448-4e4e-49ba-8bf0-694d5376f953'
  AND NOT (enabled_features @> '["bonus_funnel"]'::jsonb);

-- 6b. Seed role_permissions for the Halo Efekt Admin role (parent + expanded children),
--     matching seedDefaultRoles/expandPermissionKeys behavior for a newly enabled feature.
DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';
  v_admin_role_id UUID;
  v_key TEXT;
  v_keys TEXT[] := ARRAY[
    'bonus_funnel',
    'bonus_funnel.clients',
    'bonus_funnel.campaigns',
    'bonus_funnel.bonuses'
  ];
BEGIN
  SELECT id INTO v_admin_role_id
  FROM tenant_roles
  WHERE tenant_id = v_tenant_id AND name = 'Admin'
  LIMIT 1;

  IF v_admin_role_id IS NOT NULL THEN
    FOREACH v_key IN ARRAY v_keys LOOP
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (v_admin_role_id, v_key)
      ON CONFLICT (role_id, permission_key) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ==========================================
-- VERIFICATION (runnable — match media_items migration style)
-- ==========================================
-- Isolation guarantee — anon CANNOT read leads / sync log:
--   SET ROLE anon; SELECT count(*) FROM so_leads;         RESET ROLE; -- expect 0
--   SET ROLE anon; SELECT count(*) FROM so_esp_sync_log;  RESET ROLE; -- expect 0
--   SET ROLE anon; SELECT count(*) FROM so_clients;       RESET ROLE; -- expect 0 (no anon policy)
-- Public read — anon sees only published:
--   SET ROLE anon; SELECT count(*) FROM so_campaigns WHERE published = false; RESET ROLE; -- expect 0
--   SET ROLE anon; SELECT count(*) FROM so_bonuses;       RESET ROLE; -- expect 0 rows for unpublished-campaign bonuses
-- Column-level anon hardening — internal ESP columns are NOT granted to anon:
--   SET ROLE anon; SELECT esp_audience_ref FROM so_campaigns; RESET ROLE; -- expect ERROR: permission denied for column
--   SET ROLE anon; SELECT id, slug, published FROM so_campaigns WHERE published = true; RESET ROLE; -- OK (granted cols)
-- Feature flag:
--   SELECT enabled_features FROM tenants WHERE id = '19342448-4e4e-49ba-8bf0-694d5376f953'; -- includes "bonus_funnel"
--   SELECT permission_key FROM role_permissions rp
--     JOIN tenant_roles tr ON tr.id = rp.role_id
--     WHERE tr.tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953' AND tr.name = 'Admin'
--       AND rp.permission_key LIKE 'bonus_funnel%'; -- 4 rows
-- Then: npm run db:types  &&  grep "so_leads" packages/database/src/types.ts
