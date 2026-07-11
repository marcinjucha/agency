/**
 * Tests for query handlers in handlers.server.ts.
 *
 * Targets pure handlers (e.g. getLicensesHandler) so we don't drive the
 * createServerFn RPC pipeline. Same pattern as actions.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import type { License, Activation } from '../types'
import { messages } from '@/lib/messages'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { makeLicense, makeActivation } from './fixtures'

// --- Mocks ---

const mockServerClient: Record<string, any> = {}

vi.mock('@/lib/supabase/server-start.server', () => ({
  createServerClient: vi.fn(() => mockServerClient),
}))

// Partial mock: stub requireAuthContextFull, keep the real hasPermission so the
// read guard's actual prefix-match logic is exercised.
vi.mock('@/lib/server-auth.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server-auth.server')>()
  return {
    ...actual,
    requireAuthContextFull: vi.fn(),
  }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  getLicensesHandler,
  getLicenseHandler,
  getLicenseActivationsHandler,
} from '../handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

// --- Helpers ---

function makeAuth(
  overrides: Partial<{ isSuperAdmin: boolean; permissions: string[] }> = {},
) {
  return {
    supabase: {},
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenantName: 'Test',
    isSuperAdmin: overrides.isSuperAdmin ?? false,
    roleName: 'member',
    permissions: overrides.permissions ?? ['system.docforge_licenses'],
  }
}

let fromCalls: ReturnType<typeof mockChain>[] = []

function setupServerFrom(...chains: ReturnType<typeof mockChain>[]) {
  fromCalls = chains
  let callIndex = 0
  mockServerClient.from = vi.fn(() => {
    const chain = fromCalls[callIndex] ?? fromCalls[fromCalls.length - 1]
    callIndex++
    return chain
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: authorized member (granted system.docforge_licenses).
  mockRequireAuth.mockReturnValue(okAsync(makeAuth()))
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const licenseFixture: License = makeLicense()
const activationFixture: Activation = makeActivation()

// =========================================================================
// getLicensesHandler
// =========================================================================

describe('getLicensesHandler', () => {
  it('returns array of licenses on success', async () => {
    setupServerFrom(mockChain({ data: [licenseFixture], error: null }))

    const result = await getLicensesHandler()

    expect(result).toEqual([licenseFixture])
  })

  it('throws on supabase error', async () => {
    setupServerFrom(mockChain({ data: null, error: { message: 'DB error' } }))

    await expect(getLicensesHandler()).rejects.toEqual({ message: 'DB error' })
  })

  it('returns empty array when no data', async () => {
    setupServerFrom(mockChain({ data: null, error: null }))

    const result = await getLicensesHandler()

    expect(result).toEqual([])
  })

  it('allows a member granted system.docforge_licenses (not super_admin)', async () => {
    mockRequireAuth.mockReturnValue(
      okAsync(makeAuth({ isSuperAdmin: false, permissions: ['system.docforge_licenses'] })),
    )
    setupServerFrom(mockChain({ data: [licenseFixture], error: null }))

    const result = await getLicensesHandler()

    expect(result).toEqual([licenseFixture])
  })

  it('rejects a member without the permission', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false, permissions: [] })))

    await expect(getLicensesHandler()).rejects.toThrow(messages.common.noPermission)
  })
})

// =========================================================================
// getLicenseHandler
// =========================================================================

describe('getLicenseHandler', () => {
  it('returns single license by id', async () => {
    setupServerFrom(mockChain({ data: licenseFixture, error: null }))

    const result = await getLicenseHandler(licenseFixture.id)

    expect(result).toEqual(licenseFixture)
  })

  it('throws on supabase error', async () => {
    setupServerFrom(mockChain({ data: null, error: { message: 'Not found' } }))

    await expect(getLicenseHandler('bad-id')).rejects.toEqual({ message: 'Not found' })
  })

  it('rejects a member without the permission', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false, permissions: [] })))

    await expect(getLicenseHandler(licenseFixture.id)).rejects.toThrow(
      messages.common.noPermission,
    )
  })
})

// =========================================================================
// getLicenseActivationsHandler
// =========================================================================

describe('getLicenseActivationsHandler', () => {
  it('returns activations for a license', async () => {
    setupServerFrom(mockChain({ data: [activationFixture], error: null }))

    const result = await getLicenseActivationsHandler('lic-001')

    expect(result).toEqual([activationFixture])
  })

  it('throws on supabase error', async () => {
    setupServerFrom(mockChain({ data: null, error: { message: 'DB error' } }))

    await expect(getLicenseActivationsHandler('lic-001')).rejects.toEqual({
      message: 'DB error',
    })
  })

  it('returns empty array when no activations', async () => {
    setupServerFrom(mockChain({ data: null, error: null }))

    const result = await getLicenseActivationsHandler('lic-001')

    expect(result).toEqual([])
  })

  it('rejects a member without the permission', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false, permissions: [] })))

    await expect(getLicenseActivationsHandler('lic-001')).rejects.toThrow(
      messages.common.noPermission,
    )
  })
})
