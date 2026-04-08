import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { License, Activation } from '../types'
import { makeLicense, makeActivation } from './fixtures'

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/client — chainable Supabase mock
// ---------------------------------------------------------------------------

let mockResolvedValue: { data: unknown; error: unknown }

function createChainProxy(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, never>> = {
    get(_target, prop) {
      if (prop === 'then') return undefined // prevent auto-await of chain
      if (prop === 'single') {
        return () => Promise.resolve(mockResolvedValue)
      }
      if (prop === 'order') {
        // Terminal for list queries (no .single())
        return (..._args: unknown[]) => Promise.resolve(mockResolvedValue)
      }
      // All other chain methods return proxy
      return (..._args: unknown[]) => createChainProxy()
    },
  }
  return new Proxy({} as Record<string, never>, handler)
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createChainProxy(),
}))

const { getLicenses, getLicense, getLicenseActivations } = await import('../queries')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const licenseFixture: License = makeLicense()
const activationFixture: Activation = makeActivation()

// ---------------------------------------------------------------------------
// Tests: getLicenses
// ---------------------------------------------------------------------------

describe('getLicenses', () => {
  beforeEach(() => {
    mockResolvedValue = { data: null, error: null }
  })

  it('returns array of licenses on success', async () => {
    mockResolvedValue = { data: [licenseFixture], error: null }

    const result = await getLicenses()

    expect(result).toEqual([licenseFixture])
  })

  it('throws on supabase error', async () => {
    mockResolvedValue = { data: null, error: { message: 'DB error' } }

    await expect(getLicenses()).rejects.toEqual({ message: 'DB error' })
  })

  it('returns empty array when no data', async () => {
    mockResolvedValue = { data: null, error: null }

    const result = await getLicenses()

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Tests: getLicense
// ---------------------------------------------------------------------------

describe('getLicense', () => {
  beforeEach(() => {
    mockResolvedValue = { data: null, error: null }
  })

  it('returns single license by id', async () => {
    mockResolvedValue = { data: licenseFixture, error: null }

    const result = await getLicense(licenseFixture.id)

    expect(result).toEqual(licenseFixture)
  })

  it('throws on supabase error', async () => {
    mockResolvedValue = { data: null, error: { message: 'Not found' } }

    await expect(getLicense('bad-id')).rejects.toEqual({ message: 'Not found' })
  })
})

// ---------------------------------------------------------------------------
// Tests: getLicenseActivations
// ---------------------------------------------------------------------------

describe('getLicenseActivations', () => {
  beforeEach(() => {
    mockResolvedValue = { data: null, error: null }
  })

  it('returns activations for a license', async () => {
    mockResolvedValue = { data: [activationFixture], error: null }

    const result = await getLicenseActivations('lic-001')

    expect(result).toEqual([activationFixture])
  })

  it('throws on supabase error', async () => {
    mockResolvedValue = { data: null, error: { message: 'DB error' } }

    await expect(getLicenseActivations('lic-001')).rejects.toEqual({ message: 'DB error' })
  })

  it('returns empty array when no activations', async () => {
    mockResolvedValue = { data: null, error: null }

    const result = await getLicenseActivations('lic-001')

    expect(result).toEqual([])
  })
})
