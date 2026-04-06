import { createClient } from '@/lib/supabase/client'
import { validatePermissionKeys } from '@/lib/permissions'
import type { TenantRoleWithPermissions } from './types'

/**
 * Fetch all tenant roles with their permissions and user count.
 * Browser client — for TanStack Query in RoleList component.
 *
 * For each role:
 * 1. Fetches permission keys from role_permissions
 * 2. Validates keys against known set (discards stale/removed keys)
 * 3. Counts assigned users from user_roles
 */
export async function getRoles(): Promise<TenantRoleWithPermissions[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenant_roles')
    .select(`
      id,
      tenant_id,
      name,
      description,
      is_default,
      created_at,
      updated_at,
      role_permissions (
        permission_key
      ),
      user_roles (
        user_id
      )
    `)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map(transformRoleRow)
}

// --- Transform helpers ---

type RawRoleRow = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  role_permissions: { permission_key: string }[] | null
  user_roles: { user_id: string }[] | null
}

function transformRoleRow(row: RawRoleRow): TenantRoleWithPermissions {
  const rawKeys = (row.role_permissions ?? []).map((rp) => rp.permission_key)

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
    permissions: validatePermissionKeys(rawKeys),
    user_count: (row.user_roles ?? []).length,
  }
}
