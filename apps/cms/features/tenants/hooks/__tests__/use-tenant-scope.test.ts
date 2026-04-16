import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNavigate, useSearch, useLocation } from '@tanstack/react-router'

import { usePermissions } from '@/contexts/permissions-context'
import { useTenantScope } from '../use-tenant-scope'

const mockNavigate = vi.fn()
const OWN_TENANT = 'aaaa-1111'
const OTHER_TENANT = 'bbbb-2222'

function mockPermissions(overrides: Record<string, unknown> = {}) {
  vi.mocked(usePermissions).mockReturnValue({
    userId: 'user-1',
    permissions: [],
    isSuperAdmin: false,
    roleName: 'admin',
    tenantId: OWN_TENANT,
    tenantName: 'My Tenant',
    enabledFeatures: [],
    tenants: [
      { id: OWN_TENANT, name: 'My Tenant' },
      { id: OTHER_TENANT, name: 'Other Tenant' },
    ],
    hasPermission: () => false,
    ...overrides,
  } as ReturnType<typeof usePermissions>)
}

function mockNavigation(params: Record<string, string> = {}, pathname = '/admin/users') {
  vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  vi.mocked(useSearch).mockReturnValue(params as any)
  vi.mocked(useLocation).mockReturnValue({ pathname, search: '', hash: '', href: pathname, searchStr: '', state: {} } as any)
}

beforeEach(() => {
  mockNavigate.mockReset()
})

// --- selectedTenantId ---

describe('selectedTenantId', () => {
  it('non-super-admin returns own tenantId regardless of URL param', () => {
    mockPermissions({ isSuperAdmin: false })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.selectedTenantId).toBe(OWN_TENANT)
  })

  it('super admin with no URL param returns own tenantId', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({})

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.selectedTenantId).toBe(OWN_TENANT)
  })

  it('super admin with ?tenant=uuid returns that uuid', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.selectedTenantId).toBe(OTHER_TENANT)
  })
})

// --- isOtherTenant ---

describe('isOtherTenant', () => {
  it('true when selectedTenantId differs from own tenantId', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.isOtherTenant).toBe(true)
  })

  it('false when same as own', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({})

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.isOtherTenant).toBe(false)
  })

  it('false for non-super-admin even with URL param', () => {
    mockPermissions({ isSuperAdmin: false })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    expect(result.current.isOtherTenant).toBe(false)
  })
})

// --- setTenantScope ---

describe('setTenantScope', () => {
  it('updates URL searchParams with tenant id', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({})

    const { result } = renderHook(() => useTenantScope())
    act(() => result.current.setTenantScope(OTHER_TENANT))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/users',
      search: { tenant: OTHER_TENANT },
    })
  })

  it('removes param when selecting own tenant', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    act(() => result.current.setTenantScope(OWN_TENANT))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/users',
      search: {},
    })
  })
})

// --- resetToOwn ---

describe('resetToOwn', () => {
  it('removes tenant param from URL', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({ tenant: OTHER_TENANT })

    const { result } = renderHook(() => useTenantScope())
    act(() => result.current.resetToOwn())

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/users',
      search: {},
    })
  })

  it('preserves other query params when removing tenant', () => {
    mockPermissions({ isSuperAdmin: true })
    mockNavigation({ tenant: OTHER_TENANT, tab: 'roles' })

    const { result } = renderHook(() => useTenantScope())
    act(() => result.current.resetToOwn())

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/users',
      search: { tab: 'roles' },
    })
  })
})
