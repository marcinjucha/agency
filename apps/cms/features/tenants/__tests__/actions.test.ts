import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err, okAsync, errAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

// --- Mocks ---

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/result-helpers', () => ({
  requireAuthResult: vi.fn(),
  zodParse: vi.fn(),
  fromSupabase: vi.fn(),
}))

const mockServiceClient: Record<string, any> = {}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}))

import { requireAuthResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { revalidatePath } from 'next/cache'
import { createTenant, updateTenant, deactivateTenant, deleteTenant } from '../actions'

const mockRequireAuth = requireAuthResult as ReturnType<typeof vi.fn>
const mockZodParse = zodParse as ReturnType<typeof vi.fn>
const mockFromSupabase = fromSupabase as ReturnType<typeof vi.fn>

// --- Helpers ---

function makeAuth(overrides: Partial<{
  tenantId: string
  isSuperAdmin: boolean
}> = {}) {
  return {
    supabase: {},
    userId: 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    tenantName: 'Test Tenant',
    isSuperAdmin: overrides.isSuperAdmin ?? true,
    roleName: 'admin',
    permissions: ['system.tenants'],
  }
}

/**
 * Chainable mock for Supabase service client.
 * Tracks calls per table for assertions.
 */
function mockChain(finalValue: unknown) {
  const chain: Record<string, any> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalValue)
  chain.then = vi.fn((resolve: any, reject?: any) => Promise.resolve(finalValue).then(resolve, reject))
  chain.catch = vi.fn((fn: any) => Promise.resolve(finalValue).catch(fn))
  return chain
}

/** Track mockServiceClient.from() calls sequentially */
let fromCalls: ReturnType<typeof mockChain>[] = []

function setupServiceFrom(...chains: ReturnType<typeof mockChain>[]) {
  fromCalls = chains
  let callIndex = 0
  mockServiceClient.from = vi.fn(() => {
    const chain = fromCalls[callIndex] ?? fromCalls[fromCalls.length - 1]
    callIndex++
    return chain
  })
  // For deleteTenantCascade which calls createServiceClient().auth.admin.deleteUser
  mockServiceClient.auth = {
    admin: {
      deleteUser: vi.fn().mockResolvedValue({}),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default fromSupabase behavior
  mockFromSupabase.mockReturnValue((response: any) => {
    if (response.error) return err(response.error.message)
    if (!response.data) return err('Brak danych')
    return ok(response.data)
  })
})

// =========================================================================
// createTenant
// =========================================================================

describe('createTenant', () => {
  const validData = {
    name: 'New Org',
    email: 'org@test.com',
    subscription_status: 'active' as const,
    enabled_features: ['dashboard', 'surveys'] as any,
  }

  it('creates tenant and seeds default roles on success', async () => {
    mockZodParse.mockReturnValue(ok(validData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const tenantRow = { id: 'tenant-new', ...validData }
    const insertTenantChain = mockChain({ data: tenantRow, error: null })
    const insertRolesChain = mockChain({ data: [
      { id: 'role-admin', name: 'Admin' },
      { id: 'role-member', name: 'Member' },
    ], error: null })
    const insertPermsChain = mockChain(undefined)
    insertPermsChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    setupServiceFrom(insertTenantChain, insertRolesChain, insertPermsChain)

    const result = await createTenant(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(tenantRow)
    }
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('rejects non-super-admin', async () => {
    mockZodParse.mockReturnValue(ok(validData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await createTenant(validData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.tenants.superAdminRequired)
    }
  })

  it('returns validation error on invalid data', async () => {
    mockZodParse.mockReturnValue(err('Name is required'))

    const result = await createTenant({} as any)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Name is required')
    }
  })

  it('seeds permissions filtered by enabled_features', async () => {
    const dataWithShop = {
      ...validData,
      enabled_features: ['dashboard', 'shop'] as any,
    }
    mockZodParse.mockReturnValue(ok(dataWithShop))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const tenantRow = { id: 'tenant-new', ...dataWithShop }
    const insertTenantChain = mockChain({ data: tenantRow, error: null })
    const insertRolesChain = mockChain({ data: [
      { id: 'role-admin', name: 'Admin' },
      { id: 'role-member', name: 'Member' },
    ], error: null })

    // Capture the permissions inserted
    let insertedPermissions: any[] = []
    const insertPermsChain = mockChain(undefined)
    insertPermsChain.insert = vi.fn((perms: any) => {
      insertedPermissions = perms
      return insertPermsChain
    })
    insertPermsChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    setupServiceFrom(insertTenantChain, insertRolesChain, insertPermsChain)

    await createTenant(dataWithShop)

    // Admin should get dashboard + shop + shop children (expanded)
    const adminPerms = insertedPermissions.filter((p: any) => p.role_id === 'role-admin')
    const adminKeys = adminPerms.map((p: any) => p.permission_key)
    expect(adminKeys).toContain('dashboard')
    expect(adminKeys).toContain('shop')
    expect(adminKeys).toContain('shop.products')
    expect(adminKeys).toContain('shop.categories')
    expect(adminKeys).toContain('shop.marketplace')
    // Should NOT contain surveys (not in enabled_features)
    expect(adminKeys).not.toContain('surveys')

    // Member should get only DEFAULT_MEMBER_PERMISSIONS intersected with enabled
    const memberPerms = insertedPermissions.filter((p: any) => p.role_id === 'role-member')
    const memberKeys = memberPerms.map((p: any) => p.permission_key)
    expect(memberKeys).toContain('dashboard')
    // surveys is in DEFAULT_MEMBER_PERMISSIONS but not in enabled_features
    expect(memberKeys).not.toContain('surveys')
  })
})

// =========================================================================
// updateTenant
// =========================================================================

describe('updateTenant', () => {
  const validData = {
    name: 'Updated Org',
    email: 'org@test.com',
    subscription_status: 'active' as const,
    enabled_features: ['dashboard', 'surveys', 'shop'] as any,
  }

  it('updates tenant row and syncs permissions on success', async () => {
    mockZodParse.mockReturnValue(ok(validData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const updatedRow = { id: 'tenant-1', ...validData }
    // fetchOldEnabledFeatures
    const fetchOldChain = mockChain({ data: { enabled_features: ['dashboard', 'surveys'] }, error: null })
    // updateTenantRow
    const updateChain = mockChain({ data: updatedRow, error: null })
    // syncFeaturePermissions: shop was added → addPermissionsToAdminRole
    // First: no removed features, so only add path
    // addPermissionsToAdminRole: select admin role, then upsert
    const selectAdminChain = mockChain({ data: [{ id: 'admin-role-1' }], error: null })
    const upsertChain = mockChain({ error: null })
    upsertChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    setupServiceFrom(fetchOldChain, updateChain, selectAdminChain, upsertChain)

    const result = await updateTenant('tenant-1', validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(updatedRow)
    }
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('rejects non-super-admin', async () => {
    mockZodParse.mockReturnValue(ok(validData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await updateTenant('tenant-1', validData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.tenants.superAdminRequired)
    }
  })

  it('grants new permissions to Admin role when feature is added', async () => {
    const newData = {
      ...validData,
      enabled_features: ['dashboard', 'surveys', 'shop'] as any,
    }
    mockZodParse.mockReturnValue(ok(newData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const fetchOldChain = mockChain({ data: { enabled_features: ['dashboard', 'surveys'] }, error: null })
    const updateChain = mockChain({ data: { id: 'tenant-1', ...newData }, error: null })

    // addPermissionsToAdminRole
    const selectAdminChain = mockChain({ data: [{ id: 'admin-role-1' }], error: null })
    let upsertedRows: any[] = []
    const upsertChain = mockChain({ error: null })
    upsertChain.upsert = vi.fn((rows: any) => {
      upsertedRows = rows
      return upsertChain
    })
    upsertChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    setupServiceFrom(fetchOldChain, updateChain, selectAdminChain, upsertChain)

    await updateTenant('tenant-1', newData)

    const addedKeys = upsertedRows.map((r: any) => r.permission_key)
    expect(addedKeys).toContain('shop')
    expect(addedKeys).toContain('shop.products')
    expect(addedKeys).toContain('shop.categories')
    expect(addedKeys).toContain('shop.marketplace')
  })

  it('revokes permissions from ALL roles when feature is removed', async () => {
    const newData = {
      ...validData,
      enabled_features: ['dashboard'] as any, // removed surveys and shop
    }
    mockZodParse.mockReturnValue(ok(newData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const fetchOldChain = mockChain({ data: { enabled_features: ['dashboard', 'surveys'] }, error: null })
    const updateChain = mockChain({ data: { id: 'tenant-1', ...newData }, error: null })

    // removePermissionsFromTenantRoles: select tenant roles, then delete
    const selectRolesChain = mockChain({ data: [{ id: 'role-1' }, { id: 'role-2' }], error: null })
    selectRolesChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ data: [{ id: 'role-1' }, { id: 'role-2' }], error: null })))

    let deletedKeys: any[] = []
    const deletePermsChain = mockChain({ error: null })
    deletePermsChain.in = vi.fn(function(this: any, col: string, vals: any[]) {
      if (col === 'permission_key') deletedKeys = vals
      return this
    })
    deletePermsChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    setupServiceFrom(fetchOldChain, updateChain, selectRolesChain, deletePermsChain)

    await updateTenant('tenant-1', newData)

    expect(deletedKeys).toContain('surveys')
  })

  it('skips sync when features do not change', async () => {
    const sameData = {
      ...validData,
      enabled_features: ['dashboard', 'surveys'] as any,
    }
    mockZodParse.mockReturnValue(ok(sameData))
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const fetchOldChain = mockChain({ data: { enabled_features: ['dashboard', 'surveys'] }, error: null })
    const updateChain = mockChain({ data: { id: 'tenant-1', ...sameData }, error: null })

    setupServiceFrom(fetchOldChain, updateChain)

    const result = await updateTenant('tenant-1', sameData)

    expect(result.success).toBe(true)
    // Only 2 from() calls: fetchOld + update. No sync calls.
    expect(mockServiceClient.from).toHaveBeenCalledTimes(2)
  })
})

// =========================================================================
// deactivateTenant
// =========================================================================

describe('deactivateTenant', () => {
  it('sets subscription_status to cancelled on success', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const deactivateChain = mockChain({ data: { id: 'tenant-1', subscription_status: 'cancelled' }, error: null })
    setupServiceFrom(deactivateChain)

    const result = await deactivateTenant('tenant-1')

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await deactivateTenant('tenant-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.tenants.superAdminRequired)
    }
  })
})

// =========================================================================
// deleteTenant
// =========================================================================

describe('deleteTenant', () => {
  it('deletes tenant and cleans up auth users on success', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ tenantId: 'other-tenant' })))

    // users select
    const usersChain = mockChain(undefined)
    usersChain.then = undefined
    usersChain.select = vi.fn().mockReturnValue(usersChain)
    usersChain.eq = vi.fn().mockResolvedValue({ data: [{ id: 'auth-user-1' }], error: null })

    // tenants delete
    const deleteChain = mockChain(undefined)
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain)
    deleteChain.eq = vi.fn().mockResolvedValue({ error: null })

    setupServiceFrom(usersChain, deleteChain)

    const result = await deleteTenant('tenant-1')

    expect(result.success).toBe(true)
    expect(mockServiceClient.auth.admin.deleteUser).toHaveBeenCalledWith('auth-user-1')
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await deleteTenant('tenant-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.tenants.superAdminRequired)
    }
  })

  it('cannot delete own tenant', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ tenantId: 'tenant-1' })))

    const result = await deleteTenant('tenant-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.tenants.cannotDeleteOwnTenant)
    }
  })
})
