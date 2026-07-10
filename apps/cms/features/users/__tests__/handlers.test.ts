/**
 * Security-gate tests for the user-management mutation handlers (iter-3c fix loop).
 *
 * Targets the pure handlers in handlers.server.ts directly (not the createServerFn
 * RPC pipeline) — same pattern as the venture handler tests.
 *
 * What MUST be correct (per the security review):
 *  - SEC-1: create/update/delete require an UNSCOPED caller (owner/admin/super_admin).
 *           A scoped member with 'system.users' is denied — no self-promote, no
 *           minting a controlled admin.
 *  - SEC-2: service-client writes are tenant-scoped — a caller in tenant A cannot
 *           mutate a target in tenant B. super_admin is exempt (cross-tenant OK).
 *  - SEC-3: a role change is rejected when the caller's rank <= the target's rank
 *           (an admin cannot demote a peer admin; owner/super_admin preserved).
 *  - LOW-1: a super_admin target's coarse users.role is never bumped by the toggle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { messages } from '@/lib/messages'

vi.mock('@/lib/server-auth.server', () => {
  // Faithful copy of the shared unscoped-actor predicate (parity with SQL role list).
  const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
  return {
    requireAuthContextFull: vi.fn(),
    FULL_ACCESS_ROLES,
    isUnscopedActor: (actor: { isSuperAdmin: boolean; roleName: string | null }) =>
      actor.isSuperAdmin || FULL_ACCESS_ROLES.has(actor.roleName ?? ''),
  }
})

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { requireAuthContextFull } from '@/lib/server-auth.server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from '../handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>
const mockCreateService = createServiceClient as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'
const CALLER = 'caller-1'
const TARGET = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ROLE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const USERS_PERM = ['system.users']

type Actor = {
  userId?: string
  tenantId?: string
  roleName?: string | null
  isSuperAdmin?: boolean
}

function setAuth(actor: Actor = {}, permissions: string[] = USERS_PERM) {
  mockRequireAuth.mockReturnValue(
    okAsync({
      supabase: {},
      userId: actor.userId ?? CALLER,
      tenantId: actor.tenantId ?? TENANT,
      isSuperAdmin: actor.isSuperAdmin ?? false,
      roleName: actor.roleName === undefined ? 'admin' : actor.roleName,
      permissions,
    }),
  )
}

/**
 * Mock the service client. One shared chain per table (cached) so every
 * `.from(name)` in a handler shares the same terminal value + spies. `authAdmin`
 * supplies the auth.admin surface (createUser/deleteUser/updateUserById).
 */
function setService(
  tables: Record<string, unknown> = {},
  authAdmin: Record<string, unknown> = {},
) {
  const chains: Record<string, ReturnType<typeof mockChain>> = {}
  const from = vi.fn((name: string) => {
    if (!chains[name]) {
      chains[name] = mockChain(tables[name] ?? { data: null, error: null })
    }
    return chains[name]
  })
  mockCreateService.mockReturnValue({ from, auth: { admin: authAdmin } })
  return { from, chains }
}

/** Fresh auth.admin mocks per use — implementations survive clearAllMocks/mockReset. */
function freshAuthAdmin() {
  return {
    createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-new' } }, error: null }),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
    updateUserById: vi.fn().mockResolvedValue({ error: null }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// SEC-1 — unscoped-actor gate on create / update / delete
// ===========================================================================

describe('SEC-1: create/update/delete require an unscoped caller', () => {
  const createInput = {
    email: 'new@example.com',
    password: 'password123',
    fullName: 'New User',
    roleId: ROLE_ID,
    clientAccess: 'all' as const,
  }

  it('denies createUser for a scoped member even WITH system.users', async () => {
    setAuth({ roleName: 'member' })
    setService()

    const result = await createUserHandler(createInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Rejected BEFORE any service-client access — no user minted.
    expect(mockCreateService).not.toHaveBeenCalled()
  })

  it('denies updateUser for a scoped member (self-promote attempt)', async () => {
    // member tries to promote THEMSELVES to 'all' (→ users.role='admin').
    setAuth({ userId: CALLER, roleName: 'member' })
    setService()

    const result = await updateUserHandler({ userId: CALLER, clientAccess: 'all' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(mockCreateService).not.toHaveBeenCalled()
  })

  it('denies deleteUser for a scoped member', async () => {
    setAuth({ roleName: 'member' })
    setService()

    const result = await deleteUserHandler(TARGET)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(mockCreateService).not.toHaveBeenCalled()
  })

  it('allows createUser for an admin', async () => {
    setAuth({ roleName: 'admin' })
    setService(
      { users: { data: { id: 'auth-new' }, error: null }, user_roles: { data: { id: 'ur' }, error: null } },
      freshAuthAdmin(),
    )

    const result = await createUserHandler(createInput)

    expect(result.success).toBe(true)
  })

  it('allows updateUser for an owner', async () => {
    setAuth({ roleName: 'owner' })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, clientAccess: 'all' })

    expect(result.success).toBe(true)
    expect(chains.users.update).toHaveBeenCalledWith({ role: 'admin' })
  })

  it('allows updateUser for a super_admin (non-full-access role name)', async () => {
    setAuth({ roleName: 'member', isSuperAdmin: true })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, fullName: 'Renamed' })

    expect(result.success).toBe(true)
    expect(chains.users.update).toHaveBeenCalledWith({ full_name: 'Renamed' })
  })
})

// ===========================================================================
// SEC-2 — tenant-scoped service writes (super_admin cross-tenant preserved)
// ===========================================================================

describe('SEC-2: no cross-tenant mutation via the service client', () => {
  it('denies updateUser when the target is in another tenant (non-super-admin)', async () => {
    setAuth({ roleName: 'admin', tenantId: TENANT })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: OTHER_TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, fullName: 'X' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Target was fetched, but NO write happened.
    expect(chains.users.update).not.toHaveBeenCalled()
  })

  it('allows a super_admin to update a target in another tenant', async () => {
    setAuth({ roleName: 'member', isSuperAdmin: true, tenantId: TENANT })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: OTHER_TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, fullName: 'X' })

    expect(result.success).toBe(true)
    expect(chains.users.update).toHaveBeenCalledWith({ full_name: 'X' })
  })

  it('denies deleteUser when the target is in another tenant (non-super-admin)', async () => {
    setAuth({ roleName: 'admin', tenantId: TENANT })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: OTHER_TENANT }, error: null },
    })

    const result = await deleteUserHandler(TARGET)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.users.delete).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// SEC-3 — role-rank guard on a real role change
// ===========================================================================

describe('SEC-3: role-rank guard', () => {
  it('denies an admin demoting a peer admin (equal rank)', async () => {
    setAuth({ roleName: 'admin' })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'admin', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, clientAccess: 'selected' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.users.cannotChangeHigherRankRole)
    // No role write — peer admin untouched.
    expect(chains.users.update).not.toHaveBeenCalled()
  })

  it("allows an admin to edit a peer admin's NAME only (clientAccess='all', role unchanged)", async () => {
    // EditUserDialog always merges clientAccess into the payload; an admin target
    // derives clientAccess='all'. Editing a PEER admin's name sends clientAccess='all'
    // → nextRole='admin' === current 'admin' → NO real transition → rank check must
    // NOT fire (equal rank would otherwise fail-closed and block the rename).
    setAuth({ roleName: 'admin' })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'admin', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({
      userId: TARGET,
      fullName: 'Renamed Peer',
      clientAccess: 'all',
    })

    expect(result.success).toBe(true)
  })

  it('allows an admin to change a lower-rank member', async () => {
    setAuth({ roleName: 'admin' })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'member', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, clientAccess: 'all' })

    expect(result.success).toBe(true)
    expect(chains.users.update).toHaveBeenCalledWith({ role: 'admin' })
  })

  it('keeps an owner protected — no role write, no rank block on a name edit', async () => {
    // super_admin edits an owner: owner role is preserved (nextRoleOnUpdate=null),
    // so the rank check does not fire and the name change still applies.
    setAuth({ roleName: 'member', isSuperAdmin: true })
    const { chains } = setService({
      users: { data: { is_super_admin: false, role: 'owner', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, clientAccess: 'selected' })

    expect(result.success).toBe(true)
    // The owner's coarse role was NEVER written.
    const roleWrites = (chains.users.update.mock.calls as unknown[][]).filter(
      ([arg]) => (arg as { role?: string }).role !== undefined,
    )
    expect(roleWrites).toHaveLength(0)
  })
})

// ===========================================================================
// FIX 5 — the tenant_role (user_roles) upsert lands under the TARGET user's
// tenant, not the caller's. A super_admin editing a cross-tenant user's role
// otherwise wrote user_roles under the super_admin's OWN tenant → getAuthFull
// reads by the target's tenant → the change silently no-ops.
// ===========================================================================

describe('FIX 5: tenant_role upsert targets the TARGET tenant', () => {
  it('super_admin editing a cross-tenant user writes user_roles under the TARGET tenant', async () => {
    setAuth({ roleName: 'member', isSuperAdmin: true, tenantId: TENANT })
    const { chains } = setService({
      users: {
        data: { is_super_admin: false, role: 'member', tenant_id: OTHER_TENANT },
        error: null,
      },
    })

    const result = await updateUserHandler({ userId: TARGET, roleId: ROLE_ID })

    expect(result.success).toBe(true)
    // The upsert must key on OTHER_TENANT (the target's tenant), NOT TENANT
    // (the super_admin's own tenant) — otherwise getAuthFull never sees it.
    expect(chains.user_roles.upsert).toHaveBeenCalledWith(
      { user_id: TARGET, tenant_id: OTHER_TENANT, role_id: ROLE_ID },
      { onConflict: 'user_id,tenant_id' },
    )
  })

  it('non-super caller writes user_roles under their own (== target) tenant', async () => {
    setAuth({ roleName: 'admin', tenantId: TENANT })
    const { chains } = setService({
      users: {
        data: { is_super_admin: false, role: 'member', tenant_id: TENANT },
        error: null,
      },
    })

    const result = await updateUserHandler({ userId: TARGET, roleId: ROLE_ID })

    expect(result.success).toBe(true)
    expect(chains.user_roles.upsert).toHaveBeenCalledWith(
      { user_id: TARGET, tenant_id: TENANT, role_id: ROLE_ID },
      { onConflict: 'user_id,tenant_id' },
    )
  })
})

// ===========================================================================
// LOW-1 — a super_admin target's coarse role is never bumped
// ===========================================================================

describe('LOW-1: super_admin target role write skipped', () => {
  it('does not write users.role when the target is a super_admin', async () => {
    // super_admin editing another super_admin; UI forces clientAccess='all'.
    setAuth({ roleName: 'member', isSuperAdmin: true })
    const { chains } = setService({
      users: { data: { is_super_admin: true, role: 'member', tenant_id: TENANT }, error: null },
    })

    const result = await updateUserHandler({ userId: TARGET, clientAccess: 'all' })

    expect(result.success).toBe(true)
    // The super_admin's member role is NOT bumped to admin.
    expect(chains.users.update).not.toHaveBeenCalledWith({ role: 'admin' })
    expect(chains.users.update).not.toHaveBeenCalled()
  })
})
