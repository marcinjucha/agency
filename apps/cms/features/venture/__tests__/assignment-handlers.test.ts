/**
 * Tests for the venture per-user client-assignment handlers (iter 3a).
 *
 * Targets the pure handlers in assignment-handlers.server.ts directly (not the
 * createServerFn RPC pipeline) — same pattern as admin-handlers.test.ts.
 *
 * What MUST be correct (per spec):
 *  - replace-set is a real DIFF (add only new, delete only removed, leave unchanged),
 *  - a cross-tenant clientId rejects the WHOLE op before any write,
 *  - a cross-tenant target user is rejected (no leak of another tenant's map),
 *  - a scoped member caller is denied (only unscoped owner/admin/super_admin manage),
 *  - empty clientIds clears every current assignment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { messages } from '@/lib/messages'

vi.mock('@/lib/server-auth.server', () => {
  // Faithful copy of the shared unscoped-actor predicate (kept in parity with the
  // SQL role list). The handlers import isUnscopedActor from here.
  const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
  return {
    requireAuthContextFull: vi.fn(),
    FULL_ACCESS_ROLES,
    isUnscopedActor: (actor: { isSuperAdmin: boolean; roleName: string | null }) =>
      actor.isSuperAdmin || FULL_ACCESS_ROLES.has(actor.roleName ?? ''),
  }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  listAssignmentsForUserHandler,
  setUserClientAssignmentsHandler,
} from '../assignment-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'
const TARGET_USER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USERS_PERM = ['system.users']

type Actor = { roleName?: string | null; isSuperAdmin?: boolean }

/**
 * One shared mockChain per table name (cached), so every `.from(name)` call in a
 * handler shares the same terminal value + spies (matches admin-handlers.test.ts).
 */
function setupAuth(
  tableResults: Record<string, unknown>,
  permissions: string[] = USERS_PERM,
  actor: Actor = { roleName: 'owner', isSuperAdmin: false },
) {
  const chains: Record<string, ReturnType<typeof mockChain>> = {}
  const from = vi.fn((name: string) => {
    if (!chains[name]) {
      chains[name] = mockChain(tableResults[name] ?? { data: null, error: null })
    }
    return chains[name]
  })
  mockRequireAuth.mockReturnValue(
    okAsync({
      supabase: { from },
      userId: 'caller-1',
      tenantId: TENANT,
      isSuperAdmin: actor.isSuperAdmin ?? false,
      roleName: actor.roleName === undefined ? 'owner' : actor.roleName,
      permissions,
    }),
  )
  return { from, chains }
}

const userInTenant = { data: { id: TARGET_USER }, error: null }

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// Permission gating + unscoped-actor gate
// ===========================================================================

describe('permission gating', () => {
  it('rejects list without system.users', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.clients'])

    const result = await listAssignmentsForUserHandler(TARGET_USER)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects set without system.users', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.clients'])

    const result = await setUserClientAssignmentsHandler(TARGET_USER, [])

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects set for a scoped member (has permission but not unscoped)', async () => {
    // A scoped member should never hold system.users, but even if granted it, the
    // unscoped gate must reject — mirrors the so_client_assignments INSERT RLS.
    const { from } = setupAuth({ users: userInTenant }, USERS_PERM, {
      roleName: 'member',
      isSuperAdmin: false,
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Rejected BEFORE any DB access.
    expect(from).not.toHaveBeenCalled()
  })

  it('allows a super_admin (non-full-access role) to set assignments', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_clients: { data: [{ id: 'c1' }], error: null },
        so_client_assignments: { data: [], error: null },
      },
      USERS_PERM,
      { roleName: 'member', isSuperAdmin: true },
    )

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(true)
    expect(chains.so_client_assignments.upsert).toHaveBeenCalled()
  })

  it('allows an admin to set assignments', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_clients: { data: [{ id: 'c1' }], error: null },
        so_client_assignments: { data: [], error: null },
      },
      USERS_PERM,
      { roleName: 'admin', isSuperAdmin: false },
    )

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(true)
    expect(chains.so_client_assignments.upsert).toHaveBeenCalled()
  })
})

// ===========================================================================
// Target-user tenant verification (no cross-tenant existence leak)
// ===========================================================================

describe('target-user tenant verification', () => {
  it('list rejects a target user not in the caller tenant', async () => {
    const { chains } = setupAuth({ users: { data: null, error: null } })

    const result = await listAssignmentsForUserHandler(TARGET_USER)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // The user lookup is tenant-scoped; assignments are never read.
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_client_assignments).toBeUndefined()
  })

  it('set rejects a target user not in the caller tenant (before any write)', async () => {
    const { chains } = setupAuth({ users: { data: null, error: null } })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_client_assignments).toBeUndefined()
  })

  it('list returns the assigned client ids for an in-tenant user', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_client_assignments: {
        data: [{ client_id: 'c1' }, { client_id: 'c2' }],
        error: null,
      },
    })

    const result = await listAssignmentsForUserHandler(TARGET_USER)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['c1', 'c2'])
    expect(chains.so_client_assignments.eq).toHaveBeenCalledWith('user_id', TARGET_USER)
  })
})

// ===========================================================================
// Super-admin cross-tenant Scope Bar edit (effectiveTenantId threading).
// A super_admin editing a user in ANOTHER tenant passes an explicit tenantId;
// the read path scopes to THAT tenant. A NON-super caller's tenantId param is
// IGNORED and forced to auth.tenantId (no cross-tenant read exploit).
// ===========================================================================

describe('effective-tenant threading (super_admin Scope Bar edit)', () => {
  it('super_admin + tenantId=<other>: assertUserInTenant scopes to the OTHER tenant and returns its assignments', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_client_assignments: { data: [{ client_id: 'c1' }], error: null },
      },
      USERS_PERM,
      { roleName: 'member', isSuperAdmin: true },
    )

    const result = await listAssignmentsForUserHandler(TARGET_USER, OTHER_TENANT)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['c1'])
    // The user existence check is scoped to the PROVIDED tenant, not the caller's.
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(chains.users.eq).not.toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('NON-super caller + tenantId=<other>: param IGNORED, scoped to auth.tenantId (no cross-tenant read)', async () => {
    // KEY SECURITY TEST: an owner (unscoped but NOT super) must not be able to
    // read another tenant's assignment map by passing tenantId=<other>.
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_client_assignments: { data: [{ client_id: 'c1' }], error: null },
      },
      USERS_PERM,
      { roleName: 'owner', isSuperAdmin: false },
    )

    const result = await listAssignmentsForUserHandler(TARGET_USER, OTHER_TENANT)

    expect(result.success).toBe(true)
    // Forced to the caller's own tenant — the OTHER tenant is never queried.
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.users.eq).not.toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
  })

  it('super_admin + tenantId=<other>: set scopes assertClientsOwned to the OTHER tenant', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_clients: { data: [{ id: 'c1' }], error: null },
        so_client_assignments: { data: [], error: null },
      },
      USERS_PERM,
      { roleName: 'member', isSuperAdmin: true },
    )

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'], OTHER_TENANT)

    expect(result.success).toBe(true)
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(chains.so_client_assignments.upsert).toHaveBeenCalled()
  })

  it('NON-super caller + tenantId=<other>: set IGNORES the param, scopes writes to auth.tenantId', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_clients: { data: [{ id: 'c1' }], error: null },
        so_client_assignments: { data: [], error: null },
      },
      USERS_PERM,
      { roleName: 'owner', isSuperAdmin: false },
    )

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'], OTHER_TENANT)

    expect(result.success).toBe(true)
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.users.eq).not.toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(chains.so_clients.eq).not.toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
  })

  it('own-tenant edit (tenantId=own) behaves identically to omitting it', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_client_assignments: { data: [{ client_id: 'c1' }], error: null },
    })

    const result = await listAssignmentsForUserHandler(TARGET_USER, TENANT)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['c1'])
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('empty target org (super_admin cross-tenant): user exists there, assignments empty → clean (no error)', async () => {
    const { chains } = setupAuth(
      {
        users: userInTenant,
        so_client_assignments: { data: [], error: null },
      },
      USERS_PERM,
      { roleName: 'member', isSuperAdmin: true },
    )

    const result = await listAssignmentsForUserHandler(TARGET_USER, OTHER_TENANT)

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
    expect(chains.users.eq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
  })
})

// ===========================================================================
// Cross-tenant clientId rejection (whole-op, no partial application)
// ===========================================================================

describe('cross-tenant clientId rejection', () => {
  it('rejects the whole op when any clientId is not in the tenant', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      // Only c1 belongs to the tenant; c2 is foreign → count mismatch.
      so_clients: { data: [{ id: 'c1' }], error: null },
      so_client_assignments: { data: [], error: null },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1', 'c2'])

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // The tenant check ran, scoped to tenant + the requested ids…
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_clients.in).toHaveBeenCalledWith('id', ['c1', 'c2'])
    // …and NOTHING was written (no partial application).
    expect(chains.so_client_assignments?.upsert).toBeUndefined()
    expect(chains.so_client_assignments?.delete).toBeUndefined()
  })
})

// ===========================================================================
// Replace-set diff (real diff — not delete-all-reinsert)
// ===========================================================================

describe('replace-set diff', () => {
  it('inserts only added, deletes only removed, leaves unchanged untouched', async () => {
    // Current = [c1, c2]; desired = [c2, c3] → add c3, delete c1, keep c2.
    const { chains } = setupAuth({
      users: userInTenant,
      so_clients: { data: [{ id: 'c2' }, { id: 'c3' }], error: null },
      so_client_assignments: {
        data: [{ client_id: 'c1' }, { client_id: 'c2' }],
        error: null,
      },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c2', 'c3'])

    expect(result.success).toBe(true)

    // INSERT contains ONLY c3 (the added), never c2 (unchanged).
    const insertArg = chains.so_client_assignments.upsert.mock.calls[0][0]
    const insertedIds = (insertArg as { client_id: string }[]).map((r) => r.client_id)
    expect(insertedIds).toEqual(['c3'])
    expect(insertedIds).not.toContain('c2')

    // DELETE targets ONLY c1 (the removed), scoped to the user.
    expect(chains.so_client_assignments.delete).toHaveBeenCalled()
    expect(chains.so_client_assignments.eq).toHaveBeenCalledWith('user_id', TARGET_USER)
    expect(chains.so_client_assignments.in).toHaveBeenCalledWith('client_id', ['c1'])
  })

  it('is a no-op write when desired equals current (nothing added or removed)', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_clients: { data: [{ id: 'c1' }, { id: 'c2' }], error: null },
      so_client_assignments: {
        data: [{ client_id: 'c1' }, { client_id: 'c2' }],
        error: null,
      },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1', 'c2'])

    expect(result.success).toBe(true)
    expect(chains.so_client_assignments.upsert).not.toHaveBeenCalled()
    expect(chains.so_client_assignments.delete).not.toHaveBeenCalled()
  })

  it('inserts new assignments when the user had none', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_clients: { data: [{ id: 'c1' }], error: null },
      so_client_assignments: { data: [], error: null },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(true)
    const insertArg = chains.so_client_assignments.upsert.mock.calls[0][0]
    expect(insertArg).toEqual([{ user_id: TARGET_USER, client_id: 'c1' }])
    expect(chains.so_client_assignments.delete).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Empty clientIds clears every current assignment
// ===========================================================================

describe('empty clientIds clears all assignments', () => {
  it('deletes every current assignment and inserts nothing', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_client_assignments: {
        data: [{ client_id: 'c1' }, { client_id: 'c2' }],
        error: null,
      },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, [])

    expect(result.success).toBe(true)
    // No client-tenant check needed (no ids to verify) and no insert.
    expect(chains.so_clients).toBeUndefined()
    expect(chains.so_client_assignments.upsert).not.toHaveBeenCalled()
    // Delete targets exactly the two current ids, scoped to the user.
    expect(chains.so_client_assignments.delete).toHaveBeenCalled()
    expect(chains.so_client_assignments.eq).toHaveBeenCalledWith('user_id', TARGET_USER)
    expect(chains.so_client_assignments.in).toHaveBeenCalledWith('client_id', ['c1', 'c2'])
  })

  it('is a full no-op when the user already had no assignments', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_client_assignments: { data: [], error: null },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, [])

    expect(result.success).toBe(true)
    expect(chains.so_client_assignments.upsert).not.toHaveBeenCalled()
    expect(chains.so_client_assignments.delete).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Idempotent add — concurrent double-submit must NOT surface venture.slugTaken
// ===========================================================================

describe('idempotent assignment insert (concurrent double-add)', () => {
  it('adds via upsert with ON CONFLICT (user_id, client_id) DO NOTHING', async () => {
    const { chains } = setupAuth({
      users: userInTenant,
      so_clients: { data: [{ id: 'c1' }], error: null },
      so_client_assignments: { data: [], error: null },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(true)
    // The add path is idempotent: upsert (INSERT ... ON CONFLICT DO NOTHING) targeting
    // the exact UNIQUE(user_id, client_id) constraint, NOT a plain insert that could 23505.
    expect(chains.so_client_assignments.upsert).toHaveBeenCalledWith(
      [{ user_id: TARGET_USER, client_id: 'c1' }],
      { onConflict: 'user_id,client_id', ignoreDuplicates: true },
    )
  })

  it('does not produce a slugTaken error on the add path', async () => {
    // Concurrent winner already inserted c1 → ON CONFLICT DO NOTHING returns no error.
    // The 23505→slugTaken mapping must never fire for an assignment add.
    const { chains } = setupAuth({
      users: userInTenant,
      so_clients: { data: [{ id: 'c1' }], error: null },
      so_client_assignments: { data: [], error: null },
    })

    const result = await setUserClientAssignmentsHandler(TARGET_USER, ['c1'])

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.error).not.toBe(messages.venture.slugTaken)
    expect(chains.so_client_assignments.upsert).toHaveBeenCalled()
  })
})
