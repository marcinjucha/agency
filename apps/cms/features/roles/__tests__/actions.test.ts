import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err, okAsync, errAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

// --- Mocks ---

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockSupabase = {
  from: vi.fn(),
}

function mockChain(finalValue: unknown) {
  const chain: Record<string, any> = {}
  const handler = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalValue)
  // For insert without .single() — resolves directly
  chain.then = vi.fn((resolve: any) => Promise.resolve(resolve(finalValue)))
  return chain
}

function makeAuth(overrides: Partial<{
  tenantId: string
  isSuperAdmin: boolean
  permissions: string[]
}> = {}) {
  return {
    supabase: mockSupabase,
    userId: 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    tenantName: 'Test Tenant',
    isSuperAdmin: overrides.isSuperAdmin ?? false,
    roleName: 'admin',
    permissions: overrides.permissions ?? ['system.roles'],
  }
}

vi.mock('@/lib/result-helpers', () => ({
  authResult: vi.fn(),
  zodParse: vi.fn(),
  fromSupabase: vi.fn(),
}))

import { authResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { createRole, updateRole, deleteRole } from '../actions'
import { revalidatePath } from 'next/cache'

const mockAuthResult = authResult as ReturnType<typeof vi.fn>
const mockZodParse = zodParse as ReturnType<typeof vi.fn>
const mockFromSupabase = fromSupabase as ReturnType<typeof vi.fn>

beforeEach(() => {
  // Default: fromSupabase extracts data from { data, error } response
  mockFromSupabase.mockReturnValue((response: any) => {
    if (response.error) return err(response.error.message)
    if (!response.data) return err('Brak danych')
    return ok(response.data)
  })
})

// =========================================================================
// createRole
// =========================================================================

describe('createRole', () => {
  it('uses auth.tenantId when no tenantId in input', async () => {
    const auth = makeAuth()
    mockZodParse.mockReturnValue(ok({ name: 'Editor', permissions: ['surveys'], description: null }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    // insertRole chain
    const insertRoleChain = mockChain({ data: { id: 'role-1' }, error: null })
    // insertPermissions chain
    const insertPermsChain = mockChain({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(insertRoleChain)  // tenant_roles insert
      .mockReturnValueOnce(insertPermsChain) // role_permissions insert

    const result = await createRole({ name: 'Editor', permissions: ['surveys'] as any })

    expect(result.success).toBe(true)
    // Verify tenant_id used in insert
    expect(insertRoleChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1' }),
    )
  })

  it('super admin can target different tenant via input.tenantId', async () => {
    const auth = makeAuth({ isSuperAdmin: true })
    mockZodParse.mockReturnValue(ok({
      name: 'Editor',
      permissions: ['surveys'],
      description: null,
      tenantId: 'other-tenant',
    }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    const insertRoleChain = mockChain({ data: { id: 'role-1' }, error: null })
    const insertPermsChain = mockChain({ data: null, error: null })
    mockSupabase.from
      .mockReturnValueOnce(insertRoleChain)
      .mockReturnValueOnce(insertPermsChain)

    const result = await createRole({ name: 'Editor', permissions: ['surveys'] as any, tenantId: 'other-tenant' })

    expect(result.success).toBe(true)
    expect(insertRoleChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'other-tenant' }),
    )
  })

  it('non-super-admin ignores tenantId override and uses own tenant', async () => {
    const auth = makeAuth({ isSuperAdmin: false })
    mockZodParse.mockReturnValue(ok({
      name: 'Editor',
      permissions: ['surveys'],
      description: null,
      tenantId: 'other-tenant',
    }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    const insertRoleChain = mockChain({ data: { id: 'role-1' }, error: null })
    const insertPermsChain = mockChain({ data: null, error: null })
    mockSupabase.from
      .mockReturnValueOnce(insertRoleChain)
      .mockReturnValueOnce(insertPermsChain)

    const result = await createRole({ name: 'Editor', permissions: ['surveys'] as any, tenantId: 'other-tenant' })

    expect(result.success).toBe(true)
    expect(insertRoleChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1' }),
    )
  })

  it('rejects user without system.roles permission', async () => {
    const auth = makeAuth({ permissions: [] })
    mockZodParse.mockReturnValue(ok({ name: 'Editor', permissions: ['surveys'], description: null }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    const result = await createRole({ name: 'Editor', permissions: ['surveys'] as any })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.roles.createFailed)
  })
})

// =========================================================================
// updateRole
// =========================================================================

describe('updateRole', () => {
  it('replaces all permissions (delete old + insert new)', async () => {
    const auth = makeAuth()
    mockZodParse.mockReturnValue(ok({
      roleId: 'role-1',
      name: 'Updated',
      permissions: ['blog', 'surveys'],
      description: null,
    }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    // updateRoleFields uses .then(checkSupabaseError)
    const updateChain = mockChain(undefined)
    updateChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    // deletePermissions uses .then(checkSupabaseError)
    const deleteChain = mockChain(undefined)
    deleteChain.then = vi.fn((resolve: any) => Promise.resolve(resolve({ error: null })))

    // insertPermissions
    const insertChain = mockChain({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(updateChain)  // tenant_roles update
      .mockReturnValueOnce(deleteChain)  // role_permissions delete
      .mockReturnValueOnce(insertChain)  // role_permissions insert

    const result = await updateRole({
      roleId: 'role-1',
      name: 'Updated',
      permissions: ['blog', 'surveys'] as any,
    })

    expect(result.success).toBe(true)
    // Verify delete was called on role_permissions
    expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions')
    expect(deleteChain.delete).toHaveBeenCalled()
    // Verify insert with new permissions
    expect(insertChain.insert).toHaveBeenCalledWith([
      { role_id: 'role-1', permission_key: 'blog' },
      { role_id: 'role-1', permission_key: 'surveys' },
    ])
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('rejects without system.roles permission', async () => {
    const auth = makeAuth({ permissions: [] })
    mockZodParse.mockReturnValue(ok({
      roleId: 'role-1',
      name: 'Updated',
      permissions: ['blog'],
      description: null,
    }))
    mockAuthResult.mockReturnValue(okAsync(auth))

    const result = await updateRole({
      roleId: 'role-1',
      name: 'Updated',
      permissions: ['blog'] as any,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.roles.updateFailed)
  })
})

// =========================================================================
// deleteRole
// =========================================================================

describe('deleteRole', () => {
  it('rejects default role deletion (is_default=true)', async () => {
    const auth = makeAuth()
    mockAuthResult.mockReturnValue(okAsync(auth))

    // validateDeleteTarget query returns is_default: true
    const selectChain = mockChain({ data: { is_default: true }, error: null })
    mockSupabase.from.mockReturnValueOnce(selectChain)

    const result = await deleteRole('role-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.roles.cannotDeleteDefault)
  })

  it('returns specific error for FK constraint (role has users)', async () => {
    const auth = makeAuth()
    mockAuthResult.mockReturnValue(okAsync(auth))

    // validateDeleteTarget: is_default false
    const selectChain = mockChain({ data: { is_default: false }, error: null })
    // removeRole: FK error — the final .eq() must return a rejected promise
    const fkError = new Error('violates foreign key constraint on user_roles')
    const rejectedPromise = Promise.reject(fkError)
    // Prevent unhandled rejection warning
    rejectedPromise.catch(() => {})
    const deleteChain: Record<string, any> = {}
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain)
    deleteChain.eq = vi.fn().mockReturnValue(deleteChain)
    // Make the chain thenable (a promise)
    deleteChain.then = vi.fn((resolve: any, reject: any) => rejectedPromise.then(resolve, reject))
    deleteChain.catch = vi.fn((fn: any) => rejectedPromise.catch(fn))

    mockSupabase.from
      .mockReturnValueOnce(selectChain)   // tenant_roles select (validateDeleteTarget)
      .mockReturnValueOnce(deleteChain)    // tenant_roles delete (removeRole)

    const result = await deleteRole('role-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.roles.cannotDeleteWithUsers)
  })

  it('rejects without system.roles permission', async () => {
    const auth = makeAuth({ permissions: [] })
    mockAuthResult.mockReturnValue(okAsync(auth))

    const result = await deleteRole('role-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.roles.deleteFailed)
  })
})
