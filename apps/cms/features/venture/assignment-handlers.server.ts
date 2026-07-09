import { err, errAsync, ok, okAsync, ResultAsync } from 'neverthrow'
import { isUnscopedActor, type AuthContextFull } from '@/lib/server-auth.server'
import type { PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import {
  type DbErrorShape,
  type MutationResult,
  type VoidResult,
  dbError,
  fromSupabaseVoidSafe,
  gated,
  tbl,
  toMutation,
  toVoid,
} from './handler-base.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — per-user CLIENT-ASSIGNMENT handlers (iter 3a).
// AUTHENTICATED, admin-only layer that manages rows in so_client_assignments
// (user_id, client_id) — the row-level ownership map from migration
// 20260709120000. A scoped member (role='member') assigned to client X then
// sees only X + its campaigns/bonuses/leads (RLS from iter 1 enforces the READ
// scoping — this file is only the ASSIGNMENT management backend).
//
// Enforcement (defense-in-depth over the so_client_assignments INSERT/DELETE RLS
// gate, which requires super_admin OR owner/admin + so_client_in_current_tenant):
//   requireAuthContextFull() → hasPermission('system.users') → isUnscopedActor()
//   → target user in caller tenant → EVERY clientId in caller tenant → write.
//
// Binding is PER-USER (rows keyed on user_id, client_id), NOT role-based.
//
// Gating mirrors features/users/server.ts: user management is gated on the
// 'system.users' permission. On top of that, assignment WRITES additionally
// require an UNSCOPED actor (owner/admin/super_admin) — a scoped member must
// never grant access (else self-escalation), matching the RLS write gate.
//
// Uses the RLS/cookie-scoped client from the auth context (auth.supabase) — the
// same client the users list already reads tenant users with. NEVER the
// service-role client (would bypass tenant isolation + the tenant-guard trigger).
//
// Pure handlers (no createServerFn wrapper) so they are unit-testable without
// driving the RPC pipeline — same split as admin-handlers.server.ts. The thin
// createServerFn wrappers live in assignments.ts.
// ---------------------------------------------------------------------------

// User management reuses the SAME PermissionKey as features/users/server.ts.
const PERM_USERS: PermissionKey = 'system.users'

// ---------------------------------------------------------------------------
// Verification helpers
// ---------------------------------------------------------------------------

/**
 * Resolve that the target user belongs to the caller's tenant, or a forbidden
 * error. Prevents leaking the existence of another tenant's user's assignment
 * map (RLS would also filter, but this is a clean app-layer error + defense in
 * depth). Missing OR foreign-tenant → indistinguishable, both forbidden.
 */
function assertUserInTenant(
  auth: AuthContextFull,
  userId: string,
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'users')
      .select('id')
      .eq('id', userId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string } | null; error: DbErrorShape }
    if (r.error) {
      console.error('[venture] assertUserInTenant failed:', r.error)
      return err(messages.venture.operationFailed)
    }
    if (!r.data) return err(messages.common.noPermission)
    return ok(undefined)
  })
}

/**
 * Verify that EVERY clientId belongs to the caller's tenant. One batched query
 * (mirrors assertBonusesInCampaign in admin-handlers): if the count of tenant
 * clients matching the requested ids differs from the requested count, at least
 * one id is missing or cross-tenant → reject the WHOLE op (no partial write).
 * An empty list is trivially satisfied (nothing to verify).
 */
function assertClientsOwned(
  auth: AuthContextFull,
  clientIds: string[],
): ResultAsync<undefined, string> {
  if (clientIds.length === 0) return okResult()
  return ResultAsync.fromPromise(
    tbl(auth, 'so_clients')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .in('id', clientIds),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string }[] | null; error: DbErrorShape }
    if (r.error) {
      console.error('[venture] assertClientsOwned failed:', r.error)
      return err(messages.venture.operationFailed)
    }
    if ((r.data ?? []).length !== clientIds.length) {
      return err(messages.common.noPermission)
    }
    return ok(undefined)
  })
}

const okResult = (): ResultAsync<undefined, string> => okAsync(undefined)

/** Read the client ids currently assigned to a user (tenant-scoped upstream). */
function currentClientIds(
  auth: AuthContextFull,
  userId: string,
): ResultAsync<string[], string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_client_assignments').select('client_id').eq('user_id', userId),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { client_id: string }[] | null; error: DbErrorShape }
    if (r.error) {
      console.error('[venture] currentClientIds failed:', r.error)
      return err(messages.venture.operationFailed)
    }
    return ok((r.data ?? []).map((row) => row.client_id))
  })
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * Return the client ids currently assigned to a user (for pre-filling the
 * assignment editor). Gated on 'system.users'; the target user is verified to
 * belong to the caller's tenant BEFORE any assignment row is read.
 */
export function listAssignmentsForUserHandler(
  userId: string,
): Promise<MutationResult<string[]>> {
  return toMutation(
    gated(PERM_USERS, (auth) =>
      assertUserInTenant(auth, userId).andThen(() => currentClientIds(auth, userId)),
    ),
  )
}

/**
 * REPLACE-SET the client assignments for a user: diff the desired set against
 * the current set, INSERT only the added, DELETE only the removed, leave
 * unchanged rows untouched.
 *
 * Gated on 'system.users' AND an unscoped actor (owner/admin/super_admin) — a
 * scoped member must not manage assignments. Before any write: (a) the target
 * user must belong to the caller's tenant; (b) EVERY clientId must belong to the
 * caller's tenant — a single cross-tenant id rejects the whole op (no partial
 * application). Empty clientIds clears all current assignments.
 */
export function setUserClientAssignmentsHandler(
  userId: string,
  clientIds: string[],
): Promise<VoidResult> {
  const desired = desiredSet(clientIds)
  return toVoid(
    gated(PERM_USERS, (auth) =>
      isUnscopedActor(auth)
        ? assertUserInTenant(auth, userId)
            .andThen(() => assertClientsOwned(auth, desired))
            .andThen(() => currentClientIds(auth, userId))
            .andThen((current) => applyAssignmentDiff(auth, userId, current, desired))
        : errAsync<undefined, string>(messages.common.noPermission),
    ),
  )
}

// ---------------------------------------------------------------------------
// Diff internals
// ---------------------------------------------------------------------------

/** Deduplicate the desired client ids (a caller may repeat one). */
function desiredSet(clientIds: string[]): string[] {
  return [...new Set(clientIds)]
}

/**
 * Insert the added ids, delete the removed ids, skip unchanged. toAdd and
 * toDelete are disjoint (set difference), so INSERT/DELETE never conflict. Each
 * side is only issued when non-empty — an empty desired set clears all (delete
 * only), an unchanged set is a full no-op.
 */
function applyAssignmentDiff(
  auth: AuthContextFull,
  userId: string,
  current: string[],
  desired: string[],
): ResultAsync<undefined, string> {
  const currentSet = new Set(current)
  const desiredLookup = new Set(desired)
  const toAdd = desired.filter((id) => !currentSet.has(id))
  const toDelete = current.filter((id) => !desiredLookup.has(id))

  const tasks: ResultAsync<undefined, string>[] = []
  if (toDelete.length > 0) tasks.push(deleteAssignments(auth, userId, toDelete))
  if (toAdd.length > 0) tasks.push(insertAssignments(auth, userId, toAdd))

  if (tasks.length === 0) return okResult()
  return ResultAsync.combine(tasks).map(() => undefined)
}

function insertAssignments(
  auth: AuthContextFull,
  userId: string,
  clientIds: string[],
): ResultAsync<undefined, string> {
  const rows = clientIds.map((clientId) => ({ user_id: userId, client_id: clientId }))
  // Idempotent add: ON CONFLICT (user_id, client_id) DO NOTHING. Under a concurrent
  // double-submit both requests compute the same toAdd from stale current state; a
  // plain .insert() would give the loser a 23505, which mapDbError turns into the
  // nonsensical venture.slugTaken. upsert + ignoreDuplicates makes the duplicate add a
  // no-op — matching the replace-set intent (row absent → inserted, already added by a
  // concurrent writer → ignored). onConflict target = the UNIQUE(user_id, client_id)
  // constraint from migration 20260709120000.
  return ResultAsync.fromPromise(
    tbl(auth, 'so_client_assignments').upsert(rows, {
      onConflict: 'user_id,client_id',
      ignoreDuplicates: true,
    }),
    dbError,
  ).andThen(fromSupabaseVoidSafe('insertAssignments'))
}

function deleteAssignments(
  auth: AuthContextFull,
  userId: string,
  clientIds: string[],
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_client_assignments')
      .delete()
      .eq('user_id', userId)
      .in('client_id', clientIds),
    dbError,
  ).andThen(fromSupabaseVoidSafe('deleteAssignments'))
}
