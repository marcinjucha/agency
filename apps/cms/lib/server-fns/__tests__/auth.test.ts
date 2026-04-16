import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tanstack/start-server-core before importing auth (createServerClient depends on it)
vi.mock('@tanstack/start-server-core', () => ({
  getCookies: vi.fn(() => ({})),
  setCookie: vi.fn(),
}))

// Mock @tanstack/react-start createServerFn — strip wrapper, call handler directly
vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn(() => {
    const builder: Record<string, unknown> = {}
    // inputValidator: accept validator function, return same builder for chaining
    builder.inputValidator = vi.fn((_validatorFn: unknown) => builder)
    builder.handler = vi.fn((fn: unknown) => fn)
    return builder
  }),
}))

// Mock createServerClient — controlled Supabase mock
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockUsersSelect = vi.fn()

vi.mock('@/lib/supabase/server-start', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockUsersSelect,
    })),
  })),
}))

// Import after mocks are set up
import { loginFn, logoutFn, getAuthContextFn } from '../auth'

describe('loginFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success:true when credentials are valid', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    // loginFn is unwrapped to the handler by the mock
    const handler = loginFn as unknown as (args: {
      data: { email: string; password: string }
    }) => Promise<unknown>
    const result = await handler({ data: { email: 'test@test.pl', password: 'secret' } })

    expect(result).toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.pl',
      password: 'secret',
    })
  })

  it('returns success:false with error message when auth fails', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const handler = loginFn as unknown as (args: {
      data: { email: string; password: string }
    }) => Promise<unknown>
    const result = await handler({ data: { email: 'wrong@test.pl', password: 'bad' } })

    expect(result).toEqual({ success: false, error: 'Nieprawidłowy email lub hasło' })
  })

  it('calls signInWithPassword with provided credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const handler = loginFn as unknown as (args: {
      data: { email: string; password: string }
    }) => Promise<unknown>
    await handler({ data: { email: 'admin@haloefekt.pl', password: 'admin123' } })

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@haloefekt.pl',
      password: 'admin123',
    })
  })
})

describe('logoutFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls supabase.auth.signOut and returns success:true', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    const handler = logoutFn as unknown as () => Promise<unknown>
    const result = await handler()

    expect(result).toEqual({ success: true })
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})

describe('getAuthContextFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no session exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const handler = getAuthContextFn as unknown as () => Promise<unknown>
    const result = await handler()

    expect(result).toBeNull()
  })

  it('returns null when user has no tenant_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUsersSelect.mockResolvedValue({ data: { tenant_id: null, is_super_admin: false } })

    const handler = getAuthContextFn as unknown as () => Promise<unknown>
    const result = await handler()

    expect(result).toBeNull()
  })

  it('returns AuthContext when session is valid and user has tenant', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUsersSelect.mockResolvedValue({
      data: {
        tenant_id: 'tenant-abc',
        is_super_admin: false,
        role: 'member',
      },
    })

    const handler = getAuthContextFn as unknown as () => Promise<unknown>
    const result = await handler()

    expect(result).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-abc',
      isSuperAdmin: false,
    })
  })

  it('returns isSuperAdmin:true for super admin users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockUsersSelect.mockResolvedValue({
      data: {
        tenant_id: 'tenant-abc',
        is_super_admin: true,
        role: 'super_admin',
      },
    })

    const handler = getAuthContextFn as unknown as () => Promise<unknown>
    const result = await handler()

    expect(result).toEqual({
      userId: 'admin-1',
      tenantId: 'tenant-abc',
      isSuperAdmin: true,
    })
  })
})
