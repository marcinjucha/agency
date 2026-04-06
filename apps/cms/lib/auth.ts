import { createClient } from '@/lib/supabase/server'
import { messages } from '@/lib/messages'
import {
  ALL_PERMISSION_KEYS,
  validatePermissionKeys,
  type PermissionKey,
} from '@/lib/permissions'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type AuthSuccess = {
  supabase: SupabaseServerClient
  userId: string
  tenantId: string
  isSuperAdmin: boolean
  roleName: string | null
  permissions: PermissionKey[]
}

export type AuthError = { error: string }

export type AuthResult = AuthSuccess | AuthError

export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result
}

/** Roles that receive all permissions (no per-key check needed). */
const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])

/**
 * Authenticate current user and fetch their tenant_id, role, and permissions.
 *
 * Permission resolution order:
 * 1. is_super_admin → ALL_PERMISSION_KEYS
 * 2. users.role is 'owner' or 'admin' → ALL_PERMISSION_KEYS
 * 3. Otherwise → query user_roles → tenant_roles → role_permissions
 * 4. No role assigned → empty permissions (only alwaysGranted keys like dashboard work)
 */
export async function getUserWithTenant(): Promise<AuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: messages.common.notLoggedIn }

  // Fetch user with is_super_admin and legacy role field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData, error } = await (supabase as any)
    .from('users')
    .select('tenant_id, is_super_admin, role')
    .eq('id', user.id)
    .single()

  if (error || !userData?.tenant_id) {
    return { error: messages.common.userNotFound }
  }

  const isSuperAdmin: boolean = userData.is_super_admin ?? false
  const legacyRole: string | null = userData.role ?? null

  // Super admin or owner/admin legacy role → full access
  if (isSuperAdmin || (legacyRole && FULL_ACCESS_ROLES.has(legacyRole))) {
    return {
      supabase,
      userId: user.id,
      tenantId: userData.tenant_id,
      isSuperAdmin,
      roleName: legacyRole,
      permissions: [...ALL_PERMISSION_KEYS],
    }
  }

  // Query RBAC tables for permission keys
  const { permissions, roleName } = await fetchUserPermissions(
    supabase,
    user.id,
    userData.tenant_id,
  )

  return {
    supabase,
    userId: user.id,
    tenantId: userData.tenant_id,
    isSuperAdmin: false,
    roleName,
    permissions,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchUserPermissions(
  supabase: SupabaseServerClient,
  userId: string,
  tenantId: string,
): Promise<{ permissions: PermissionKey[]; roleName: string | null }> {
  // user_roles → tenant_roles → role_permissions in one query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userRole, error } = await (supabase as any)
    .from('user_roles')
    .select(`
      role_id,
      tenant_roles (
        name,
        role_permissions ( permission_key )
      )
    `)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !userRole?.tenant_roles) {
    return { permissions: [], roleName: null }
  }

  const roleName: string = userRole.tenant_roles.name
  const rawKeys: string[] = (
    userRole.tenant_roles.role_permissions ?? []
  ).map((rp: { permission_key: string }) => rp.permission_key)

  // Validate DB strings against known PermissionKey union
  const permissions = validatePermissionKeys(rawKeys)

  // Check if this tenant role grants full access
  if (FULL_ACCESS_ROLES.has(roleName)) {
    return { permissions: [...ALL_PERMISSION_KEYS], roleName }
  }

  return { permissions, roleName }
}
