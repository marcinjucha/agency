/**
 * Middleware-compatible auth helper for permission checking.
 *
 * WHY separate from auth.ts: Middleware runs in Edge Runtime and cannot use
 * the full server-side createClient() from @/lib/supabase/server (which depends
 * on next/headers cookies()). Instead it receives the Supabase client already
 * constructed by middleware.ts with request cookies.
 *
 * WHY not call getUserWithTenant() directly: That function creates its own
 * Supabase client via cookies() — unavailable in middleware context.
 */

import {
  ALL_PERMISSION_KEYS,
  validatePermissionKeys,
  type PermissionKey,
} from '@/lib/permissions'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MiddlewareUser = {
  userId: string
  tenantId: string
  isSuperAdmin: boolean
  legacyRole: string | null
  permissions: PermissionKey[]
}

/** Roles that receive all permissions (mirrors auth.ts FULL_ACCESS_ROLES). */
const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])

/**
 * Fetch user data + permissions in middleware context.
 *
 * Returns null if user not found in users table.
 * Super admin / owner / admin get ALL_PERMISSION_KEYS.
 * Otherwise queries RBAC tables (user_roles -> tenant_roles -> role_permissions).
 */
export async function fetchMiddlewareUser(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<MiddlewareUser | null> {
  const { data: userData, error } = await supabase
    .from('users')
    .select('tenant_id, is_super_admin, role')
    .eq('id', authUserId)
    .single()

  if (error || !userData?.tenant_id) return null

  const isSuperAdmin: boolean = userData.is_super_admin ?? false
  const legacyRole: string | null = userData.role ?? null
  const tenantId: string = userData.tenant_id

  // Super admin or owner/admin legacy role -> full access
  if (isSuperAdmin || (legacyRole && FULL_ACCESS_ROLES.has(legacyRole))) {
    return {
      userId: authUserId,
      tenantId,
      isSuperAdmin,
      legacyRole,
      permissions: [...ALL_PERMISSION_KEYS],
    }
  }

  // Query RBAC tables for permission keys (single query with join)
  const { permissions, roleName } = await fetchRbacPermissions(
    supabase,
    authUserId,
    tenantId,
  )

  return {
    userId: authUserId,
    tenantId,
    isSuperAdmin: false,
    legacyRole: roleName,
    permissions,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchRbacPermissions(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<{ permissions: PermissionKey[]; roleName: string | null }> {
  const { data: userRole, error } = await supabase
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

  const role = userRole.tenant_roles as unknown as {
    name: string
    role_permissions: { permission_key: string }[]
  }

  // Tenant role named 'owner' or 'admin' -> full access
  if (FULL_ACCESS_ROLES.has(role.name)) {
    return { permissions: [...ALL_PERMISSION_KEYS], roleName: role.name }
  }

  const rawKeys = (role.role_permissions ?? []).map((rp) => rp.permission_key)

  return {
    permissions: validatePermissionKeys(rawKeys),
    roleName: role.name,
  }
}
