import { describe, it, expect, vi, beforeEach } from 'vitest'
import { messages } from '@/lib/messages'
import { mockAuthSuccess, mockAuthFailure } from '@/__tests__/utils/auth-mocks'
import { mockChain } from '@/__tests__/utils/supabase-mocks'

// --- Mocks ---

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockTestConnection = vi.fn()
const mockDiscoverCalendars = vi.fn()
vi.mock('@agency/calendar', () => ({
  createCalendarProvider: vi.fn(() => ({
    testConnection: mockTestConnection,
    discoverCalendars: mockDiscoverCalendars,
  })),
  PROVIDER_TYPES: { google: 'google', caldav: 'caldav' },
}))

import { revalidatePath } from 'next/cache'
import {
  addCalDAVConnection,
  testCalendarConnection,
  setDefaultConnection,
  removeConnection,
  disconnectCalendarConnection,
  updateSurveyLinkCalendar,
  getCalendarConnections,
  updateCalendarSettings,
} from '../actions'

// --- Helpers ---

function setupAuthWithRpc(rpcData: unknown, rpcError: unknown = null) {
  const auth = mockAuthSuccess({ permissions: ['calendar'] })
  // Add .rpc() to supabase mock
  auth._supabase.rpc = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError })
  mockRequireAuth.mockResolvedValue(auth)
  return auth
}

function setupAuthWithFrom(finalValue: { data: unknown; error: unknown }) {
  const auth = mockAuthSuccess({ permissions: ['calendar'] })
  const chain = mockChain(finalValue)
  auth._supabase.from = vi.fn(() => chain)
  // Also mock .is() for the is('user_id', null) call
  chain.is = vi.fn().mockReturnValue(chain)
  mockRequireAuth.mockResolvedValue(auth)
  return { auth, chain }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =========================================================================
// addCalDAVConnection
// =========================================================================

describe('addCalDAVConnection', () => {
  const validData = {
    serverUrl: 'https://cal.example.com/dav.php',
    username: 'testuser',
    password: 'testpass',
    displayName: 'My CalDAV',
  }

  it('returns error on invalid data', async () => {
    const result = await addCalDAVConnection({
      serverUrl: 'not-a-url',
      username: '',
      password: '',
      displayName: '',
    })

    expect(result.success).toBe(false)
  })

  it('returns error when auth fails', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await addCalDAVConnection(validData)

    expect(result.success).toBe(false)
  })

  it('returns error when test connection fails', async () => {
    setupAuthWithRpc('conn-id-1')
    mockTestConnection.mockResolvedValue({
      isErr: () => true,
      error: 'Connection refused',
    })

    const result = await addCalDAVConnection(validData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Connection refused')
    }
  })

  it('persists connection via RPC on successful test', async () => {
    const auth = setupAuthWithRpc('conn-id-new')
    mockTestConnection.mockResolvedValue({ isErr: () => false, value: { success: true } })
    mockDiscoverCalendars.mockResolvedValue({
      isOk: () => true,
      value: [{ url: 'https://cal.example.com/calendars/default', displayName: 'Default' }],
    })

    const result = await addCalDAVConnection(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.connectionId).toBe('conn-id-new')
    }
    expect(auth._supabase.rpc).toHaveBeenCalledWith(
      'upsert_calendar_connection',
      expect.objectContaining({
        p_provider: 'caldav',
        p_display_name: 'My CalDAV',
      })
    )
    expect(revalidatePath).toHaveBeenCalled()
  })
})

// =========================================================================
// testCalendarConnection
// =========================================================================

describe('testCalendarConnection', () => {
  it('returns error when auth fails', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await testCalendarConnection('conn-1')

    expect(result.success).toBe(false)
  })

  it('returns error when connection not found', async () => {
    const { chain } = setupAuthWithFrom({ data: null, error: { message: 'not found' } })

    const result = await testCalendarConnection('conn-nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.calendar.connectionNotFound)
    }
  })

  it('returns success when provider test succeeds', async () => {
    const connectionRow = {
      id: 'conn-1',
      tenant_id: 'tenant-1',
      user_id: null,
      provider: 'caldav',
      display_name: 'Test CalDAV',
      credentials: { serverUrl: 'https://cal.example.com', username: 'u', password: 'p' },
      calendar_url: null,
      account_identifier: null,
      is_default: false,
      is_active: true,
    }

    const { chain } = setupAuthWithFrom({ data: null, error: null })
    // Override the from mock to return connection on first call, then update on second
    const selectChain = mockChain({ data: connectionRow, error: null })
    selectChain.is = vi.fn().mockReturnValue(selectChain)
    const updateChain = mockChain({ data: null, error: null })
    let callIdx = 0
    const { auth } = setupAuthWithFrom({ data: null, error: null })
    auth._supabase.from = vi.fn(() => {
      callIdx++
      if (callIdx === 1) return selectChain
      return updateChain
    })
    mockRequireAuth.mockResolvedValue(auth)

    mockTestConnection.mockResolvedValue({ isErr: () => false, value: { success: true } })

    const result = await testCalendarConnection('conn-1')

    expect(result.success).toBe(true)
  })
})

// =========================================================================
// setDefaultConnection
// =========================================================================

describe('setDefaultConnection', () => {
  it('returns error when auth fails', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await setDefaultConnection('conn-1')

    expect(result.success).toBe(false)
  })

  it('unsets previous defaults and sets new one', async () => {
    const { auth, chain } = setupAuthWithFrom({ data: null, error: null })

    const result = await setDefaultConnection('conn-1')

    expect(result.success).toBe(true)
    // from() should be called twice: unset old defaults + set new default
    expect(auth._supabase.from).toHaveBeenCalledTimes(2)
    expect(revalidatePath).toHaveBeenCalled()
  })
})

// =========================================================================
// removeConnection
// =========================================================================

describe('removeConnection', () => {
  it('deletes connection on success', async () => {
    setupAuthWithFrom({ data: null, error: null })

    const result = await removeConnection('conn-1')

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('returns error on DB failure', async () => {
    setupAuthWithFrom({ data: null, error: { message: 'FK violation' } })

    const result = await removeConnection('conn-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(messages.calendar.removeConnectionFailed)
    }
  })
})

// =========================================================================
// disconnectCalendarConnection
// =========================================================================

describe('disconnectCalendarConnection', () => {
  it('deactivates connection on success', async () => {
    setupAuthWithFrom({ data: null, error: null })

    const result = await disconnectCalendarConnection('conn-1')

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('returns error when auth fails', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await disconnectCalendarConnection('conn-1')

    expect(result.success).toBe(false)
  })
})

// =========================================================================
// updateSurveyLinkCalendar
// =========================================================================

describe('updateSurveyLinkCalendar', () => {
  it('updates survey_link calendar_connection_id on success', async () => {
    setupAuthWithFrom({ data: null, error: null })

    const result = await updateSurveyLinkCalendar('link-1', 'conn-1')

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('handles null connectionId (disconnect)', async () => {
    setupAuthWithFrom({ data: null, error: null })

    const result = await updateSurveyLinkCalendar('link-1', null)

    expect(result.success).toBe(true)
  })
})

// =========================================================================
// getCalendarConnections
// =========================================================================

describe('getCalendarConnections', () => {
  it('returns connections on success', async () => {
    const rows = [
      {
        id: 'conn-1',
        tenant_id: 'tenant-1',
        user_id: null,
        provider: 'google',
        display_name: 'Google',
        credentials: { access_token: 'abc' },
        calendar_url: null,
        account_identifier: 'test@gmail.com',
        is_default: true,
        is_active: true,
      },
    ]

    const { chain } = setupAuthWithFrom({ data: rows, error: null })
    // Override for fetchTenantConnections — needs array in .then()
    chain.then = (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve)

    const result = await getCalendarConnections()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].provider).toBe('google')
    }
  })

  it('returns error when auth fails', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await getCalendarConnections()

    expect(result.success).toBe(false)
  })
})

// =========================================================================
// updateCalendarSettings
// =========================================================================

describe('updateCalendarSettings', () => {
  const validSettings = {
    work_start_hour: 9,
    work_end_hour: 17,
    slot_duration_minutes: 60,
    buffer_minutes: 15,
  }

  it('updates settings on success', async () => {
    setupAuthWithFrom({ data: null, error: null })

    const result = await updateCalendarSettings(validSettings)

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('returns validation error for invalid data', async () => {
    const result = await updateCalendarSettings({
      work_start_hour: 17,
      work_end_hour: 9, // end before start
      slot_duration_minutes: 60,
      buffer_minutes: 15,
    })

    expect(result.success).toBe(false)
  })
})
