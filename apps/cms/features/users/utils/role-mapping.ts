/**
 * Pure mapping between the CMS "client access" toggle and the coarse
 * `users.role` tier that venture RLS (`can_access_so_client`) + `getAuthFull`
 * (ALL_PERMISSION_KEYS grant via `isUnscopedActor`) key off.
 *
 * WHY this exists (iter-3c): the CMS role editor only ever wrote `tenant_role`
 * (user_roles) and left `users.role` frozen at 'member' from creation — so a
 * CMS-made "admin" stayed scoped and saw zero clients. These functions are the
 * single source of the toggle→role decision, unit-tested directly; the server
 * writes are a thin DB wrapper around them.
 *
 * Coupling is intentional + user-accepted: `users.role='admin'` ALSO grants
 * ALL_PERMISSION_KEYS via getAuthFull. Decoupling that is a separate task.
 */
import type { ClientAccess } from '@/features/venture/utils/client-access'

export type { ClientAccess }

/**
 * Map the toggle to the users.role tier written on CREATE.
 * 'all' → 'admin' (unscoped, sees every client), 'selected' → 'member' (scoped).
 * CMS create NEVER mints an 'owner' (owner is a protected seeded tier).
 */
export function clientAccessToRole(access: ClientAccess): 'admin' | 'member' {
  return access === 'all' ? 'admin' : 'member'
}

/**
 * Decide the users.role to write on UPDATE, preserving a seeded 'owner'.
 *
 * Returns `null` = do NOT write. 'owner' is a protected unscoped tier and must
 * never be downgraded to 'admin'/'member' by the client-access toggle. For any
 * other current role, the toggle flips freely between 'admin' and 'member'.
 */
export function nextRoleOnUpdate(
  currentRole: string | null,
  access: ClientAccess,
): 'admin' | 'member' | null {
  if (currentRole === 'owner') return null
  return clientAccessToRole(access)
}
