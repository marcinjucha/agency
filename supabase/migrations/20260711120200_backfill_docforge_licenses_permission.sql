-- ==========================================
-- Backfill: grant 'system.docforge_licenses' to existing Admin roles
-- ==========================================
-- Gives every existing tenant's "Admin" role the new permission so current
-- operators (the Halo Efekt Admin role seeded in 20260406120000) can manage
-- DocForge licenses without needing super_admin. Matches the backfill pattern
-- from 20260501000000_add_workflows_execute_permission.sql:15-19.
--
-- Idempotent: ON CONFLICT DO NOTHING (UNIQUE(role_id, permission_key) on role_permissions).
--
-- NEW tenants: seedDefaultRoles() (apps/cms/features/tenants/server.ts:209) already grants
--   this key to the new tenant's Admin role automatically — it inserts every key in
--   ALL_PERMISSION_KEYS that passes the tenant's enabled_features filter, and
--   'system.docforge_licenses' is already a member of ALL_PERMISSION_KEYS
--   (apps/cms/lib/permissions.ts). It is granted whenever the tenant's enabled_features
--   include the 'system' group (or the exact 'system.docforge_licenses' key). No code
--   change is required for new tenants to receive this permission.

INSERT INTO role_permissions (role_id, permission_key)
SELECT id, 'system.docforge_licenses'
FROM tenant_roles
WHERE name = 'Admin'
ON CONFLICT DO NOTHING;
