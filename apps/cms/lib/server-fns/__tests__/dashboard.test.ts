import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tanstack/start-server-core before importing
vi.mock('@tanstack/start-server-core', () => ({
  getCookies: vi.fn(() => ({})),
  setCookie: vi.fn(),
}))

// Unwrap createServerFn
vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn(() => {
    const builder: Record<string, unknown> = {}
    builder.inputValidator = vi.fn(() => builder)
    builder.handler = vi.fn((fn: unknown) => fn)
    return builder
  }),
}))

// Mock getAuthContextFn — controls what auth context the dashboard sees
const mockGetAuthContext = vi.fn()
vi.mock('@/lib/server-fns/auth', () => ({
  getAuthContextFn: () => mockGetAuthContext(),
}))

// Controlled Supabase mock — each count query configurable
const mockSurveysCount = vi.fn()
const mockResponsesCount = vi.fn()
const mockAppointmentsCount = vi.fn()
const mockTenantsCount = vi.fn()

vi.mock('@/lib/supabase/server-start', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const resolveCount = () => {
        if (table === 'surveys') return mockSurveysCount()
        if (table === 'responses') return mockResponsesCount()
        if (table === 'appointments') return mockAppointmentsCount()
        if (table === 'tenants') return mockTenantsCount()
        return Promise.resolve({ count: 0 })
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        // head: true queries resolve via the chain terminal
        then: (resolve: (v: unknown) => unknown) => resolveCount().then(resolve),
      }
    }),
  })),
}))

import { getDashboardStatsFn } from '../dashboard'

const getDashboardStats = getDashboardStatsFn as unknown as () => Promise<unknown>

describe('getDashboardStatsFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero counts and null tenants when auth returns null (unauthenticated)', async () => {
    mockGetAuthContext.mockResolvedValue(null)

    const result = await getDashboardStats()

    expect(result).toEqual({
      surveys: 0,
      responses: 0,
      appointments: 0,
      tenants: null,
    })
  })

  it('returns correct counts for regular user (tenants is null)', async () => {
    mockGetAuthContext.mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-abc',
      isSuperAdmin: false,
    })
    mockSurveysCount.mockResolvedValue({ count: 5 })
    mockResponsesCount.mockResolvedValue({ count: 12 })
    mockAppointmentsCount.mockResolvedValue({ count: 3 })

    const result = await getDashboardStats()

    expect(result).toEqual({
      surveys: 5,
      responses: 12,
      appointments: 3,
      tenants: null,
    })
    // Tenants count should NOT be queried for non-super-admin
    expect(mockTenantsCount).not.toHaveBeenCalled()
  })

  it('returns tenants count for super admin', async () => {
    mockGetAuthContext.mockResolvedValue({
      userId: 'admin-1',
      tenantId: 'tenant-main',
      isSuperAdmin: true,
    })
    mockSurveysCount.mockResolvedValue({ count: 2 })
    mockResponsesCount.mockResolvedValue({ count: 8 })
    mockAppointmentsCount.mockResolvedValue({ count: 1 })
    mockTenantsCount.mockResolvedValue({ count: 4 })

    const result = await getDashboardStats()

    expect(result).toEqual({
      surveys: 2,
      responses: 8,
      appointments: 1,
      tenants: 4,
    })
  })

  it('returns 0 for null counts (handles Supabase count: null)', async () => {
    mockGetAuthContext.mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-abc',
      isSuperAdmin: false,
    })
    mockSurveysCount.mockResolvedValue({ count: null })
    mockResponsesCount.mockResolvedValue({ count: null })
    mockAppointmentsCount.mockResolvedValue({ count: null })

    const result = await getDashboardStats()

    expect(result).toEqual({
      surveys: 0,
      responses: 0,
      appointments: 0,
      tenants: null,
    })
  })
})
