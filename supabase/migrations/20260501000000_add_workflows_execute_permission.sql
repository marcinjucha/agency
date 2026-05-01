-- Seed 'workflows.execute' permission for Admin roles.
-- WHY: AAA-T-210 adds a CMS retry endpoint; only users with this permission
-- can trigger workflow retries. Member role does NOT get this permission.
--
-- tenant_roles.name = 'Admin' (TitleCase) — as seeded by seedDefaultRoles().
-- Note: 'super_admin' is NOT a role — it is users.is_super_admin BOOLEAN flag
-- (is_super_admin() PostgreSQL helper, 20260406120000 migration). Super admins
-- bypass permission checks entirely via that flag.
-- Note: New tenants created after this migration automatically get
-- 'workflows.execute' via seedDefaultRoles() (ALL_PERMISSION_KEYS.filter).
-- This migration is for backfilling existing Admin roles only.
--
-- ON CONFLICT DO NOTHING = idempotent re-run safe.

INSERT INTO role_permissions (role_id, permission_key)
SELECT id, 'workflows.execute'
FROM tenant_roles
WHERE name = 'Admin'
ON CONFLICT DO NOTHING;
