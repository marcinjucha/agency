import { createClient } from '@/lib/supabase/client'
import type { Tenant } from './types'

/**
 * Fetch all tenants. Super admin only — no RLS filtering by tenant_id.
 * Browser client — for TanStack Query in TenantList component.
 *
 * NOTE: Regular RLS policy on tenants table returns only the user's own tenant.
 * Super admin users bypass RLS via is_super_admin, so this returns all tenants.
 * If user is not super admin, Supabase returns only their own tenant (not an error).
 */
export async function getTenants(): Promise<Tenant[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, email, domain, subscription_status, enabled_features, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Tenant[]
}

/**
 * Fetch a single tenant by ID.
 * Browser client — for TanStack Query in TenantEditor component.
 */
export async function getTenant(id: string): Promise<Tenant> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, email, domain, subscription_status, enabled_features, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Tenant
}
