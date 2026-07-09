import { ok, err, ResultAsync } from 'neverthrow'
import {
  hasPermission as _hasPermission,
  validatePermissionKeys,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from '@/lib/permissions'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { UNSCOPED_ROLE_SET } from '@/lib/roles'

/** Supabase client type from TanStack Start — re-exported for feature files. */
export type StartClient = ReturnType<typeof createServerClient>

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

/**
 * Roles that receive all permissions without per-key check (the "unscoped"
 * actors). Aliases the canonical set in `lib/roles.ts` — the SINGLE source of
 * truth shared with the client-safe mirror UNSCOPED_ROLE_NAMES in
 * features/venture/utils/client-access.ts. Kept in PARITY with the SQL role list
 * ('owner','admin') in supabase/migrations/20260709120000_venture_scoped_access.sql
 * — both can_access_so_client() and the so_clients INSERT WITH CHECK gate on the
 * same two role names. Add a third unscoped role in `lib/roles.ts` (once); the
 * SQL/TS duplication with the migration is unavoidable (no shared runtime between
 * the RLS layer and the app layer) but the two TS copies are now unified.
 */
export const FULL_ACCESS_ROLES = UNSCOPED_ROLE_SET

/**
 * True for the UNSCOPED actors (super_admin, or a FULL_ACCESS_ROLES role —
 * owner/admin). A scoped member (role='member', not super_admin) returns false.
 *
 * Single source of the unscoped-actor predicate: consumed by getAuthFull (to
 * grant ALL_PERMISSION_KEYS) AND by the venture admin handlers (to gate
 * client create/delete). Mirrors the SQL role gate in
 * 20260709120000_venture_scoped_access.sql — never re-hardcode ['owner','admin']
 * at the call sites. Takes only the two fields it needs so getAuthFull can call
 * it BEFORE the full AuthContextFull (with permissions) exists.
 */
export function isUnscopedActor(actor: {
  isSuperAdmin: boolean
  roleName: string | null
}): boolean {
  return actor.isSuperAdmin || FULL_ACCESS_ROLES.has(actor.roleName ?? '')
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Resolve minimal auth context (userId + tenantId).
 * Returns null if unauthenticated or tenant not found.
 */
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  if (isUnscopedActor({ isSuperAdmin, roleName })) {
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
