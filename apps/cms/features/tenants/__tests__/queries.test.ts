import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Tenant } from '../types'

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
        // Terminal for getTenants (no .single())
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

const { getTenants, getTenant } = await import('../queries')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tenantFixture: Tenant = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Test Tenant',
  email: 'test@example.com',
  domain: null,
  subscription_status: 'active',
  enabled_features: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests: getTenants
// ---------------------------------------------------------------------------

describe('getTenants', () => {
  beforeEach(() => {
    mockResolvedValue = { data: null, error: null }
  })

  it('returns array of tenants on success', async () => {
    mockResolvedValue = { data: [tenantFixture], error: null }

    const result = await getTenants()

    expect(result).toEqual([tenantFixture])
  })

  it('throws on supabase error', async () => {
    mockResolvedValue = { data: null, error: { message: 'DB error' } }

    await expect(getTenants()).rejects.toEqual({ message: 'DB error' })
  })
})

// ---------------------------------------------------------------------------
// Tests: getTenant
// ---------------------------------------------------------------------------

describe('getTenant', () => {
  beforeEach(() => {
    mockResolvedValue = { data: null, error: null }
  })

  it('returns single tenant by id', async () => {
    mockResolvedValue = { data: tenantFixture, error: null }

    const result = await getTenant(tenantFixture.id)

    expect(result).toEqual(tenantFixture)
  })

  it('throws on supabase error', async () => {
    mockResolvedValue = { data: null, error: { message: 'Not found' } }

    await expect(getTenant('bad-id')).rejects.toEqual({ message: 'Not found' })
  })
})
