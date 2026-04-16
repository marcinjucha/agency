import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tanstack/start-server-core before importing (createServerClient depends on it)
vi.mock('@tanstack/start-server-core', () => ({
  getCookies: vi.fn(() => ({})),
  setCookie: vi.fn(),
}))

// Unwrap createServerFn so tests call the handler directly
vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn(() => {
    const builder: Record<string, unknown> = {}
    builder.inputValidator = vi.fn(() => builder)
    builder.handler = vi.fn((fn: unknown) => fn)
    return builder
  }),
}))

// Controlled Supabase mock — each query can be configured per test
const mockGetUser = vi.fn()
const mockUsersSelect = vi.fn()
const mockTenantsSelect = vi.fn()
const mockUserRolesSelect = vi.fn()

vi.mock('@/lib/supabase/server-start', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      // Route .from() calls by table name to appropriate mock
      const queryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }

      if (table === 'users') {
        queryChain.single = mockUsersSelect
      } else if (table === 'tenants') {
        queryChain.single = mockTenantsSelect
      } else if (table === 'user_roles') {
        queryChain.single = mockUserRolesSelect
      }

      return queryChain
    }),
  })),
}))

// Import after mocks
import { getAdminLayoutDataFn } from '../admin-layout'

// Convenience alias — the mock strips the createServerFn wrapper
const getAdminLayoutData = getAdminLayoutDataFn as unknown as () => Promise<unknown>

describe('getAdminLayoutDataFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no session exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getAdminLayoutData()

    expect(result).toBeNull()
  })

  it('returns null when user has no tenant_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUsersSelect.mockResolvedValue({ data: { tenant_id: null, is_super_admin: false, role: null } })

    const result = await getAdminLayoutData()

    expect(result).toBeNull()
  })

  it('returns AdminLayoutData with all permissions for owner role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUsersSelect.mockResolvedValue({
      data: { tenant_id: 'tenant-abc', is_super_admin: false, role: 'owner' },
    })
    mockTenantsSelect
      .mockResolvedValueOnce({ data: { name: 'Halo Efekt' } })  // fetchTenantName
      .mockResolvedValueOnce({ data: { enabled_features: ['surveys', 'workflows'] } }) // fetchEnabledFeatures

    const result = await getAdminLayoutData()

    expect(result).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-abc',
      tenantName: 'Halo Efekt',
      isSuperAdmin: false,
      roleName: 'owner',
    })
    // owner role gets ALL_PERMISSION_KEYS — check for a few representative keys
    const data = result as { permissions: string[] }
    expect(data.permissions).toContain('surveys')
    expect(data.permissions).toContain('workflows')
    expect(data.permissions).toContain('system.users')
  })

  it('returns AdminLayoutData with limited permissions for regular user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    mockUsersSelect.mockResolvedValue({
      data: { tenant_id: 'tenant-xyz', is_super_admin: false, role: 'member' },
    })
    mockTenantsSelect
      .mockResolvedValueOnce({ data: { name: 'Test Org' } })   // fetchTenantName
      .mockResolvedValueOnce({ data: { enabled_features: ['surveys'] } }) // fetchEnabledFeatures
    mockUserRolesSelect.mockResolvedValue({
      data: {
        role_id: 'role-1',
        tenant_roles: {
          name: 'member',
          role_permissions: [
            { permission_key: 'surveys' },
            { permission_key: 'intake' },
          ],
        },
      },
    })

    const result = await getAdminLayoutData()

    expect(result).toMatchObject({
      userId: 'user-2',
      tenantId: 'tenant-xyz',
      tenantName: 'Test Org',
      isSuperAdmin: false,
      roleName: 'member',
    })
    const data = result as { permissions: string[]; tenants: unknown[] }
    expect(data.permissions).toContain('surveys')
    expect(data.permissions).toContain('intake')
    expect(data.permissions).not.toContain('system.users')
    // Non-super-admin: tenants list should be empty
    expect(data.tenants).toHaveLength(0)
  })

  it('returns isSuperAdmin:true with all permissions and tenants for super admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockUsersSelect.mockResolvedValue({
      data: { tenant_id: 'tenant-main', is_super_admin: true, role: null },
    })
    mockTenantsSelect
      .mockResolvedValueOnce({ data: { name: 'Main Org' } })   // fetchTenantName
      .mockResolvedValueOnce({ data: { enabled_features: [] } }) // fetchEnabledFeatures
    // fetchAllTenants uses order() not single()
    const mockTenantsOrder = vi.fn().mockResolvedValue({
      data: [
        { id: 'tenant-main', name: 'Main Org', is_active: true },
        { id: 'tenant-other', name: 'Other Org', is_active: true },
      ],
    })
    // Override the from mock for this test to handle fetchAllTenants
    const { createServerClient } = await import('@/lib/supabase/server-start')
    vi.mocked(createServerClient).mockReturnValueOnce({
      auth: { getUser: mockGetUser } as ReturnType<typeof createServerClient>['auth'],
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mockUsersSelect }
        }
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: mockTenantsOrder,
            single: vi.fn()
              .mockResolvedValueOnce({ data: { name: 'Main Org' } })
              .mockResolvedValueOnce({ data: { enabled_features: [] } }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() }
      }),
    } as unknown as ReturnType<typeof createServerClient>)

    const result = await getAdminLayoutData()

    expect(result).toMatchObject({
      userId: 'admin-1',
      tenantId: 'tenant-main',
      isSuperAdmin: true,
    })
    const data = result as { permissions: string[] }
    expect(data.permissions).toContain('system.tenants')
  })
})
