import { createClient } from '@/lib/supabase/client'
import type { UserWithRole, TenantRole } from './types'

/**
 * Fetch all users for the current tenant with their assigned role.
 * Browser client — for TanStack Query in UserList component.
 *
 * Query: users LEFT JOIN user_roles → tenant_roles
 * RLS filters by current_user_tenant_id() automatically.
 */
export async function getUsers(): Promise<UserWithRole[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('users')
    .select(`
      id,
      email,
      full_name,
      role,
      is_super_admin,
      created_at,
      updated_at,
      tenants!tenant_id (
        id,
        name
      ),
      user_roles (
        role_id,
        tenant_roles (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Transform nested user_roles → flat tenant_role
  return (data ?? []).map(transformUserRow)
}

/**
 * Fetch available tenant roles for role selector dropdown.
 * Browser client — for TanStack Query.
 */
export async function getTenantRoles(): Promise<TenantRole[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenant_roles')
    .select('id, name, description, is_default')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as TenantRole[]
}

// --- Transform helpers ---

type RawUserRow = {
  id: string
  email: string
  full_name: string | null
  role: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
  tenants: { id: string; name: string } | null
  user_roles: {
    role_id: string
    tenant_roles: { id: string; name: string } | null
  }[] | null
}

function transformUserRow(row: RawUserRow): UserWithRole {
  const userRole = row.user_roles?.[0]
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_super_admin: row.is_super_admin,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tenant_role: userRole?.tenant_roles ?? null,
    tenant: row.tenants ?? null,
  }
}
