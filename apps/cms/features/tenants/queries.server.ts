import { createServiceClient } from '@/lib/supabase/service'
import { validatePermissionKeys, type PermissionKey } from '@/lib/permissions'
import type { Tenant } from './types'

/**
 * Fetch enabled features for a specific tenant.
 * Server-only — uses service client (bypasses RLS).
 * Validates JSONB enabled_features against known PermissionKeys.
 */
export async function fetchTenantFeatures(tenantId: string): Promise<PermissionKey[]> {
  const serviceClient = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (serviceClient as any)
    .from('tenants')
    .select('enabled_features')
    .eq('id', tenantId)
    .single()

  return validatePermissionKeys((data?.enabled_features as string[]) ?? [])
}

/**
 * Fetch all tenants for super admin Scope Bar.
 * Server-only — uses service client (bypasses RLS).
 * Validates enabled_features JSONB per tenant against known PermissionKeys.
 */
export async function fetchAllTenants(): Promise<Tenant[]> {
  const serviceClient = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (serviceClient as any)
    .from('tenants')
    .select('id, name, email, domain, subscription_status, enabled_features, created_at, updated_at')
    .order('name', { ascending: true })

  return (data ?? []).map((tenant: Record<string, unknown>) => ({
    ...tenant,
    enabled_features: validatePermissionKeys((tenant.enabled_features as string[]) ?? []),
  })) as Tenant[]
}
