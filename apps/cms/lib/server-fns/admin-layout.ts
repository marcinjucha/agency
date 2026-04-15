import { createServerFn } from '@tanstack/react-start'
import { createStartClient } from '@/lib/supabase/server-start'
import { ALL_PERMISSION_KEYS, validatePermissionKeys, type PermissionKey } from '@/lib/permissions'
import type { Tenant } from '@/features/tenants/types'

export type AdminLayoutData = {
  userId: string
  tenantId: string
  tenantName: string | null
  isSuperAdmin: boolean
  roleName: string | null
  permissions: PermissionKey[]
  enabledFeatures: PermissionKey[]
  tenants: Tenant[]
}

/**
 * Fetches full admin layout data: session, permissions, tenant features, and tenants list.
 *
 * TODO: when Next.js migration is complete, unify with lib/auth.ts
 * (currently duplicated because lib/auth.ts uses createClient from next/headers).
 *
 * SRP: separate from auth.ts because this is layout-scoped data,
 * not the narrow auth context needed by getAuthContextFn.
 */
export const getAdminLayoutDataFn = createServerFn().handler(
  async (): Promise<AdminLayoutData | null> => {
    const supabase = createStartClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData } = await (supabase as any)
      .from('users')
      .select('tenant_id, is_super_admin, role')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) return null

    const tenantId: string = userData.tenant_id
    const isSuperAdmin: boolean = userData.is_super_admin ?? false
    const legacyRole: string | null = userData.role ?? null
    const tenantName = await fetchTenantName(tenantId, supabase)

    const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
    if (isSuperAdmin || (legacyRole && FULL_ACCESS_ROLES.has(legacyRole))) {
      const [enabledFeatures, tenants] = await Promise.all([
        fetchEnabledFeatures(tenantId, supabase),
        isSuperAdmin ? fetchAllTenants(supabase) : Promise.resolve<Tenant[]>([]),
      ])
      return {
        userId: user.id,
        tenantId,
        tenantName,
        isSuperAdmin,
        roleName: legacyRole,
        permissions: [...ALL_PERMISSION_KEYS],
        enabledFeatures,
        tenants,
      }
    }

    const [{ permissions, roleName }, enabledFeatures] = await Promise.all([
      fetchUserPermissions(supabase, user.id, tenantId),
      fetchEnabledFeatures(tenantId, supabase),
    ])

    return {
      userId: user.id,
      tenantId,
      tenantName,
      isSuperAdmin,
      roleName,
      permissions,
      enabledFeatures,
      tenants: [],
    }
  }
)

// ---------------------------------------------------------------------------
// Private helpers — each accepts a supabase client (DI pattern)
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof createStartClient>

async function fetchTenantName(
  tenantId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    return data?.name ?? null
  } catch {
    return null
  }
}

async function fetchUserPermissions(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<{ permissions: PermissionKey[]; roleName: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userRole } = await (supabase as any)
    .from('user_roles')
    .select(`role_id, tenant_roles(name, role_permissions(permission_key))`)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (!userRole?.tenant_roles) return { permissions: [], roleName: null }

  const roleName: string = userRole.tenant_roles.name
  const rawKeys: string[] = (userRole.tenant_roles.role_permissions ?? []).map(
    (rp: { permission_key: string }) => rp.permission_key,
  )

  const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
  if (FULL_ACCESS_ROLES.has(roleName)) {
    return { permissions: [...ALL_PERMISSION_KEYS], roleName }
  }

  return { permissions: validatePermissionKeys(rawKeys), roleName }
}

async function fetchEnabledFeatures(
  tenantId: string,
  supabase: SupabaseClient,
): Promise<PermissionKey[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('tenants')
      .select('enabled_features')
      .eq('id', tenantId)
      .single()
    return validatePermissionKeys(data?.enabled_features ?? [])
  } catch {
    return []
  }
}

async function fetchAllTenants(supabase: SupabaseClient): Promise<Tenant[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('tenants')
      .select('id, name, is_active')
      .order('name')
    return (data ?? []) as Tenant[]
  } catch {
    return []
  }
}
