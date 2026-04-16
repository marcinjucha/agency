import { ok, err, ResultAsync } from 'neverthrow'
import {
  hasPermission as _hasPermission,
  validatePermissionKeys,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from '@/lib/permissions'
import { createStartClient } from '@/lib/supabase/server-start'

/** Supabase client type from TanStack Start — re-exported for feature files. */
export type StartClient = ReturnType<typeof createStartClient>

/**
 * Minimal auth context — userId, tenantId, Supabase client.
 * Used by most features that don't need RBAC details.
 */
export type AuthContext = {
  supabase: StartClient
  userId: string
  tenantId: string
}

/**
 * Extended auth context — includes RBAC fields.
 * Used by users, roles, and permission-gated features.
 */
export type AuthContextFull = AuthContext & {
  isSuperAdmin: boolean
  roleName: string | null
  permissions: PermissionKey[]
}

/** Roles that receive all permissions without per-key check. */
const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Resolve minimal auth context (userId + tenantId).
 * Returns null if unauthenticated or tenant not found.
 */
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = createStartClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  return { supabase, userId: user.id, tenantId: userData.tenant_id as string }
}

/**
 * Resolve full auth context with RBAC (isSuperAdmin, roleName, permissions).
 * Returns null if unauthenticated or tenant not found.
 */
export async function getAuthFull(): Promise<AuthContextFull | null> {
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

  const isSuperAdmin = userData.is_super_admin === true
  const roleName = (userData.role as string) ?? null

  let permissions: PermissionKey[]
  if (isSuperAdmin || FULL_ACCESS_ROLES.has(roleName ?? '')) {
    permissions = [...ALL_PERMISSION_KEYS] as PermissionKey[]
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roleData } = await (supabase as any)
      .from('user_roles')
      .select('tenant_roles(role_permissions(permission_key))')
      .eq('user_id', user.id)
      .eq('tenant_id', userData.tenant_id)
      .maybeSingle()

    const rawKeys: string[] =
      roleData?.tenant_roles?.role_permissions?.map(
        (rp: { permission_key: string }) => rp.permission_key,
      ) ?? []
    permissions = validatePermissionKeys(rawKeys)
  }

  return {
    supabase,
    userId: user.id,
    tenantId: userData.tenant_id as string,
    isSuperAdmin,
    roleName,
    permissions,
  }
}

// ---------------------------------------------------------------------------
// ResultAsync wrappers
// ---------------------------------------------------------------------------

/**
 * Wraps getAuth() in a ResultAsync — minimal context (no RBAC).
 * Use in features that only need userId + tenantId.
 */
export function requireAuthContext(): ResultAsync<AuthContext, string> {
  return ResultAsync.fromPromise(getAuth(), String).andThen((auth) =>
    auth ? ok(auth) : err('Not authenticated'),
  )
}

/**
 * Wraps getAuthFull() in a ResultAsync — full context (userId + tenantId + RBAC).
 * Use in features that check permissions or isSuperAdmin.
 */
export function requireAuthContextFull(): ResultAsync<AuthContextFull, string> {
  return ResultAsync.fromPromise(getAuthFull(), String).andThen((auth) =>
    auth ? ok(auth) : err('Not authenticated'),
  )
}

// Re-export hasPermission for convenience — callers import from one place.
export { _hasPermission as hasPermission }
