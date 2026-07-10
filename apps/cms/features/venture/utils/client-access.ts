/**
 * Client-access scoping helpers — decide whether a user is UNSCOPED (sees every
 * client in the tenant) or SCOPED (row-restricted to the clients assigned via
 * so_client_assignments), and expose the toggle-driven picker gate the CMS user
 * editor consumes.
 *
 * AUTHORITATIVE SIGNAL (iter-3c): unscoped ⇔ `is_super_admin` OR the coarse
 * `users.role` ∈ {'owner','admin'}. The iter-3b approach keyed on the SELECTED
 * tenant_role NAME was WRONG — fragile and decoupled from the column that
 * venture RLS (`can_access_so_client`) and `getAuthFull` actually gate on. This
 * module now mirrors `users.role`, matching the server predicate `isUnscopedActor`
 * in `lib/server-auth.server.ts`.
 *
 * WHY a client-safe mirror: the server predicate lives in an import-protected
 * `.server.ts` module that MUST NOT reach a browser bundle. This module re-uses
 * the SAME role set (via the plain, client-safe `lib/roles.ts`) so the CMS UI can
 * gate the assignment picker / access badge without shipping server-only code —
 * FULL_ACCESS_ROLES (server) and UNSCOPED_ROLE_NAMES (this mirror) are now two
 * aliases of one canonical constant, so they can never drift. Keep in PARITY with
 * the SQL role list in migration 20260709120000_venture_scoped_access.sql.
 */
import { UNSCOPED_ROLE_SET } from '@/lib/roles'

/** The CMS "client access" toggle value. 'all' = unscoped, 'selected' = scoped. */
export type ClientAccess = 'all' | 'selected'

/** users.role values whose holders are unscoped (full tenant access). Canonical: UNSCOPED_ROLE_SET. */
export const UNSCOPED_ROLE_NAMES: ReadonlySet<string> = UNSCOPED_ROLE_SET

/**
 * True when a users.role value grants full (unscoped) access. EXACT match — no
 * trim/lowercase — to mirror the authoritative server predicate `isUnscopedActor`
 * (FULL_ACCESS_ROLES.has(roleName ?? '')). The UI must never treat a value the
 * server considers scoped as unscoped, so the two comparisons stay byte-identical.
 */
export function isUnscopedRoleName(role: string | null | undefined): boolean {
  if (!role) return false
  return UNSCOPED_ROLE_NAMES.has(role)
}

/**
 * True when the user sees ALL clients (no per-client scoping applies):
 * a super admin, OR a holder of an unscoped users.role (owner/admin).
 * A scoped member (role='member' or custom, not super admin) returns false.
 *
 * `role` is the coarse `users.role` column — NOT the tenant_role name.
 */
export function isUnscopedAccess(args: {
  isSuperAdmin: boolean
  role: string | null | undefined
}): boolean {
  return args.isSuperAdmin === true || isUnscopedRoleName(args.role)
}

/**
 * Derive the toggle's value from the loaded user's authoritative scope — used to
 * PREFILL the editor. owner/admin (or super admin) → 'all'; member/custom →
 * 'selected'.
 */
export function deriveClientAccess(args: {
  isSuperAdmin: boolean
  role: string | null | undefined
}): ClientAccess {
  return isUnscopedAccess(args) ? 'all' : 'selected'
}

/**
 * Should the per-client assignment picker be shown while editing?
 * Only for a SCOPED toggle value AND a non-super-admin — super admins are always
 * unscoped, so assigning specific clients is meaningless.
 */
export function showClientPicker(
  clientAccess: ClientAccess,
  isSuperAdmin: boolean,
): boolean {
  return clientAccess === 'selected' && !isSuperAdmin
}
