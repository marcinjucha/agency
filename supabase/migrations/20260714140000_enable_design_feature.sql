-- ==========================================
-- Enable the `design` (Wygływ / Motywy) feature for the Halo Efekt tenant (Bug B)
-- ==========================================
-- Client-theming shipped the `design` permission group (parent `design`, child
-- `design.themes`), the `/admin/themes` route, and the sidebar nav — but never
-- added `design` to any tenant's `enabled_features`. The role editor's
-- PermissionPicker filters out any group whose parent key + children are absent
-- from the tenant's `enabled_features` (filterDisplayGroupsByEnabledFeatures in
-- apps/cms/features/roles/components/PermissionPicker.tsx). Result: the "Wygływ"
-- group is invisible in the role editor, so admins can't grant theme access.
--
-- The feature-flag filter is INTENDED. The fix is to enable the flag for the
-- tenant (mirrors migration 20260407000000 backfill + 20260705120000 §6a for
-- bonus_funnel + the runtime syncFeaturePermissions path). The feature KEY
-- registry lives code-side in apps/cms/lib/permissions.ts (PERMISSION_GROUPS.design).
--
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit
-- approval. No schema change → no type regeneration needed.

-- 1. Column DEFAULT — so fresh tenants (db reset / direct SQL insert) mirror the
--    canonical enabled list. (New tenants created via the CMS form set the list
--    explicitly from the picker; this only governs the raw-insert path.)
ALTER TABLE tenants
  ALTER COLUMN enabled_features
  SET DEFAULT '["dashboard","surveys","intake","calendar","content","shop","workflows","system","design"]'::jsonb;

-- 2. Append 'design' to the Halo Efekt tenant's enabled_features (idempotent).
UPDATE tenants
SET enabled_features = COALESCE(enabled_features, '[]'::jsonb) || '["design"]'::jsonb
WHERE id = '19342448-4e4e-49ba-8bf0-694d5376f953'
  AND NOT (enabled_features @> '["design"]'::jsonb);

-- 3. Seed role_permissions for the Halo Efekt Admin role (parent + expanded
--    child), matching seedDefaultRoles/expandPermissionKeys for a newly enabled
--    feature (mirrors 20260705120000 §6b). Without this the Admin role sees the
--    now-visible group unchecked; seeding grants theme access as the default Admin.
DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';
  v_admin_role_id UUID;
  v_key TEXT;
  v_keys TEXT[] := ARRAY[
    'design',
    'design.themes'
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
-- VERIFICATION (runnable)
-- ==========================================
--   SELECT enabled_features FROM tenants WHERE id = '19342448-4e4e-49ba-8bf0-694d5376f953'; -- includes "design"
--   SELECT permission_key FROM role_permissions rp
--     JOIN tenant_roles tr ON tr.id = rp.role_id
--     WHERE tr.tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953' AND tr.name = 'Admin'
--       AND rp.permission_key LIKE 'design%'; -- expect 'design', 'design.themes'
