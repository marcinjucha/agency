/**
 * Tests for mutation handlers in handlers.server.ts.
 *
 * Targets pure handlers (e.g. createLicenseHandler) so we don't drive the
 * createServerFn RPC pipeline. Same pattern as workflows tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { messages } from '@/lib/messages'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { makeLicense } from './fixtures'

// --- Mocks ---

vi.mock('@/lib/server-auth.server', () => ({
  requireAuthContextFull: vi.fn(),
}))

const mockServiceClient: Record<string, any> = {}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}))

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  createLicenseHandler,
  updateLicenseHandler,
  deleteLicenseHandler,
  toggleLicenseActiveHandler,
  deactivateActivationHandler,
} from '../handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

// --- Helpers ---

function makeAuth(overrides: Partial<{ isSuperAdmin: boolean }> = {}) {
  return {
    supabase: {},
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenantName: 'Test',
    isSuperAdmin: overrides.isSuperAdmin ?? true,
    roleName: 'admin',
    permissions: ['system.docforge_licenses'],
  }
}

let fromCalls: ReturnType<typeof mockChain>[] = []

function setupServiceFrom(...chains: ReturnType<typeof mockChain>[]) {
  fromCalls = chains
  let callIndex = 0
  mockServiceClient.from = vi.fn(() => {
    const chain = fromCalls[callIndex] ?? fromCalls[fromCalls.length - 1]
    callIndex++
    return chain
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =========================================================================
// createLicenseHandler
// =========================================================================

describe('createLicenseHandler', () => {
  const validData = {
    key: 'DF-ABCD-EFGH-IJKL',
    client_name: 'Jan Kowalski',
    email: 'jan@example.com',
    expires_at: null,
    max_seats: 3,
    grace_days: 7,
  }

  it('creates license and returns ok on success', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const licenseRow = { id: 'lic-new', ...validData, is_active: true, created_at: '2026-04-08T10:00:00Z' }
    const insertChain = mockChain({ data: licenseRow, error: null })
    setupServiceFrom(insertChain)

    const result = await createLicenseHandler(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(licenseRow)
    }
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await createLicenseHandler(validData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.common.noPermission)
    }
  })
})

// =========================================================================
// updateLicenseHandler
// =========================================================================

describe('updateLicenseHandler', () => {
  const updateData = { client_name: 'Updated Name', max_seats: 5, grace_days: 7 }

  it('updates license on success', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const updatedRow = makeLicense({ client_name: 'Updated Name', max_seats: 5 })
    const updateChain = mockChain({ data: updatedRow, error: null })
    setupServiceFrom(updateChain)

    const result = await updateLicenseHandler('lic-001', updateData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.client_name).toBe('Updated Name')
    }
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await updateLicenseHandler('lic-001', updateData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.common.noPermission)
    }
  })
})

// =========================================================================
// deleteLicenseHandler
// =========================================================================

describe('deleteLicenseHandler', () => {
  it('deletes license on success', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const deleteChain = mockChain({ data: null, error: null })
    setupServiceFrom(deleteChain)

    const result = await deleteLicenseHandler('lic-001')

    expect(result.success).toBe(true)
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await deleteLicenseHandler('lic-001')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.common.noPermission)
    }
  })
})

// =========================================================================
// toggleLicenseActiveHandler
// =========================================================================

describe('toggleLicenseActiveHandler', () => {
  it('toggles is_active to false', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const updatedRow = makeLicense({ is_active: false })
    const updateChain = mockChain({ data: updatedRow, error: null })
    setupServiceFrom(updateChain)

    const result = await toggleLicenseActiveHandler('lic-001', false)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(false)
    }
  })

  it('toggles is_active to true', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const updatedRow = makeLicense({ is_active: true })
    const updateChain = mockChain({ data: updatedRow, error: null })
    setupServiceFrom(updateChain)

    const result = await toggleLicenseActiveHandler('lic-001', true)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(true)
    }
  })
})

// =========================================================================
// deactivateActivationHandler
// =========================================================================

describe('deactivateActivationHandler', () => {
  it('sets activation is_active to false', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth()))

    const deactivateChain = mockChain({ data: null, error: null })
    setupServiceFrom(deactivateChain)

    const result = await deactivateActivationHandler('act-001')

    expect(result.success).toBe(true)
  })

  it('rejects non-super-admin', async () => {
    mockRequireAuth.mockReturnValue(okAsync(makeAuth({ isSuperAdmin: false })))

    const result = await deactivateActivationHandler('act-001')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.common.noPermission)
    }
  })
})
