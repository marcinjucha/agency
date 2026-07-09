/**
 * Canonical set of coarse `users.role` values whose holders are UNSCOPED —
 * they see every client in the tenant and receive ALL_PERMISSION_KEYS via
 * getAuthFull. Single source of truth imported by BOTH:
 *   - lib/server-auth.server.ts  → FULL_ACCESS_ROLES (server predicate isUnscopedActor)
 *   - features/venture/utils/client-access.ts → UNSCOPED_ROLE_NAMES (client-safe mirror)
 *
 * Keep in PARITY with the SQL role list ('owner','admin') in migration
 * 20260709120000_venture_scoped_access.sql — both can_access_so_client() and the
 * so_clients INSERT WITH CHECK gate on the same two role names.
 *
 * IMPORTANT: this is a PLAIN .ts module with NO server-only imports. It is
 * reachable from the browser (client-access.ts ships to the client bundle), so
 * it must never import from a `.server.ts` module. Adding a third unscoped role
 * happens HERE, once — both consumers pick it up automatically, and the
 * client-access parity test (which imports this) fails loudly until the SQL
 * migration is updated to match.
 */

export const UNSCOPED_ROLES = ['owner', 'admin'] as const

export type UnscopedRole = (typeof UNSCOPED_ROLES)[number]

/** Set form for O(1) membership checks. Do not mutate. */
export const UNSCOPED_ROLE_SET: ReadonlySet<string> = new Set(UNSCOPED_ROLES)
