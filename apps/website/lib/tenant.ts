/**
 * Single-tenant website configuration.
 *
 * The website is architecturally single-tenant (Halo Efekt) but shares the
 * multi-tenant Supabase DB with shop apps (jacek, oleg). Every query on a
 * tenant-scoped table MUST filter by this tenant ID in application code —
 * `createServiceClient()` bypasses RLS, so the DB will happily return rows
 * from any tenant.
 */
export function getTenantId(): string {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) throw new Error('Missing TENANT_ID environment variable')
  return tenantId
}
