/**
 * Tests for query handlers in handlers.server.ts.
 *
 * Targets pure handlers (e.g. getLicensesHandler) so we don't drive the
 * createServerFn RPC pipeline. Same pattern as actions.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { License, Activation } from '../types'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { makeLicense, makeActivation } from './fixtures'

// --- Mocks ---

const mockServerClient: Record<string, any> = {}

vi.mock('@/lib/supabase/server-start', () => ({
  createServerClient: vi.fn(() => mockServerClient),
}))

import {
  getLicensesHandler,
  getLicenseHandler,
  getLicenseActivationsHandler,
} from '../handlers.server'

// --- Helpers ---

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
})
