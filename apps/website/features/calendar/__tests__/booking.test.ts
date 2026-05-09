/**
 * Tests for calendar booking flow (booking.ts)
 *
 * Covers: happy path, no-calendar booking, graceful degradation,
 * double-booking detection, survey/response not found, workflow trigger,
 * and Google token refresh callback.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { ok, err } from 'neverthrow'

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------

vi.stubEnv('CMS_BASE_URL', 'https://cms.test.com')
vi.stubEnv('WORKFLOW_TRIGGER_SECRET', 'test-secret')

// ---------------------------------------------------------------------------
// Supabase mock — chainable query builder
//
// bookAppointment now accepts a supabase client as the first parameter.
// We pass mockSupabase directly instead of mocking createClient.
// ---------------------------------------------------------------------------

type MockResponse = { data: unknown; error: unknown }

function createChainableQuery(response: MockResponse = { data: null, error: null }) {
  const chain: Record<string, Mock> = {}
  const self = () =>
    new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'then') return undefined // prevent Promise-like behavior
          if (!chain[prop as string]) {
            chain[prop as string] = vi.fn(() => self())
          }
          return chain[prop as string]
        },
      }
    )

  const proxy = self()

  // Terminal methods return the response directly
  const terminal = vi.fn(() => Promise.resolve(response))
  chain['single'] = terminal

  return { proxy, chain, terminal, setResponse: (r: MockResponse) => terminal.mockResolvedValue(r) }
}

// Per-table mock registry — each table gets its own query chain
const tableQueries: Record<string, ReturnType<typeof createChainableQuery>> = {}

function getTableQuery(table: string) {
  if (!tableQueries[table]) {
    tableQueries[table] = createChainableQuery()
  }
  return tableQueries[table]
}

const mockRpc = vi.fn()

const mockSupabase = {
  from: vi.fn((table: string) => getTableQuery(table).proxy),
  rpc: mockRpc,
}

// ---------------------------------------------------------------------------
// @agency/calendar mock
// ---------------------------------------------------------------------------

const mockGetConnectionForSurveyLink = vi.fn()
const mockCreateEvent = vi.fn()
const mockProvider = {
  getEvents: vi.fn(),
  createEvent: mockCreateEvent,
  deleteEvent: vi.fn(),
  testConnection: vi.fn(),
  discoverCalendars: vi.fn(),
}
const mockCreateCalendarProvider = vi.fn(() => mockProvider)

vi.mock('@agency/calendar', () => ({
  getConnectionForSurveyLink: (...args: unknown[]) => mockGetConnectionForSurveyLink(...args),
  createCalendarProvider: (...args: unknown[]) => mockCreateCalendarProvider(...args),
}))

// ---------------------------------------------------------------------------
// @/lib/messages mock
// ---------------------------------------------------------------------------

vi.mock('@/lib/messages', () => ({
  messages: {
    calendar: {
      surveyNotFound: 'Survey not found',
      responseNotFound: 'Response not found',
      surveyMissingClientFields: 'Survey missing client fields',
      availabilityCheckFailed: 'Availability check failed',
      slotUnavailable: 'Slot unavailable',
      appointmentCreationFailed: 'Appointment creation failed',
    },
  },
}))

// ---------------------------------------------------------------------------
// @/lib/routes mock
// ---------------------------------------------------------------------------

vi.mock('@/lib/routes', () => ({
  routes: {
    surveySuccess: (token: string) => `/survey/${token}/success`,
  },
}))

// ---------------------------------------------------------------------------
// Fetch mock (for workflow trigger)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn(() => Promise.resolve(new Response('ok', { status: 202 })))
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Import module under test (AFTER all mocks)
// ---------------------------------------------------------------------------

// bookAppointment now takes supabase as the first parameter — no createClient mock needed.
const { bookAppointment } = await import('../booking')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SURVEY_LINK_ID = '11111111-1111-1111-1111-111111111111'
const RESPONSE_ID = '22222222-2222-2222-2222-222222222222'
const SURVEY_ID = '33333333-3333-3333-3333-333333333333'
const USER_ID = '44444444-4444-4444-4444-444444444444'
const TENANT_ID = '55555555-5555-5555-5555-555555555555'
const APPOINTMENT_ID = '66666666-6666-6666-6666-666666666666'
const CONNECTION_ID = '77777777-7777-7777-7777-777777777777'
const BOOKING_WORKFLOW_ID = '00000000-0000-0000-0000-000000000bbb'

// Question IDs used both in `surveys.questions` (with semantic_role) AND as
// keys in `responses.answers` — that's how findAnswerByRole resolves the
// `client_name` / `client_email` roles.
const Q_NAME_ID = 'qq-name-aaaa-aaaa-aaaaaaaaaaaa'
const Q_EMAIL_ID = 'qq-mail-bbbb-bbbb-bbbbbbbbbbbb'

function validBookingRequest() {
  // AAA-T-63 (Commit 9): clientName/clientEmail/notes removed —
  // derived server-side from response.answers via semantic_role.
  return {
    surveyId: SURVEY_LINK_ID,
    responseId: RESPONSE_ID,
    startTime: '2026-04-10T10:00:00Z',
    endTime: '2026-04-10T11:00:00Z',
  }
}

function defaultSurveyQuestions() {
  // Mirrors the shape of `surveys.questions` JSONB — only the fields
  // findAnswerByRole reads (`id` + `semantic_role`) matter here.
  return [
    {
      id: Q_NAME_ID,
      type: 'text',
      question: 'Jak masz na imię?',
      required: true,
      order: 0,
      semantic_role: 'client_name',
    },
    {
      id: Q_EMAIL_ID,
      type: 'email',
      question: 'Twój email?',
      required: true,
      order: 1,
      semantic_role: 'client_email',
    },
  ]
}

function mockSurveyLinkFound(bookingWorkflowId: string | null = null) {
  tableQueries['survey_links'] = createChainableQuery({
    data: {
      booking_workflow_id: bookingWorkflowId,
      surveys: {
        id: SURVEY_ID,
        created_by: USER_ID,
        tenant_id: TENANT_ID,
        questions: defaultSurveyQuestions(),
      },
    },
    error: null,
  })
}

/**
 * Mock the response row.
 *
 * `answers` defaults to a populated client_name + client_email keyed by the
 * semantic_role question IDs. Pass `answers: { ... }` explicitly to override
 * (e.g. to simulate missing email for the RESPONSE_MISSING_CLIENT_DATA case).
 */
function mockResponseFound(
  overrides: Partial<{ answers: Record<string, unknown> }> = {},
) {
  const defaultAnswers: Record<string, unknown> = {
    [Q_NAME_ID]: 'Jan Kowalski',
    [Q_EMAIL_ID]: 'jan@test.pl',
  }
  tableQueries['responses'] = createChainableQuery({
    data: {
      id: RESPONSE_ID,
      survey_link_id: SURVEY_LINK_ID,
      answers: 'answers' in overrides ? overrides.answers : defaultAnswers,
    },
    error: null,
  })
}

function mockNoConflicts() {
  const q = createChainableQuery()
  // For appointments conflict check — uses .eq().eq() without .single()
  // Override the chain so the last .eq() resolves the data
  const eqMock = vi.fn(() => Promise.resolve({ data: [], error: null }))
  q.chain['eq'] = vi.fn(() => ({ eq: eqMock }))
  tableQueries['appointments'] = q
}

function mockAppointmentCreated() {
  // The insert chain: .insert().select().single()
  // The appointments table does NOT store client_name/client_email/notes —
  // client identity is sourced from response.answers by the booking handler,
  // not read back from the inserted row.
  const appointmentData = {
    id: APPOINTMENT_ID,
    response_id: RESPONSE_ID,
    user_id: USER_ID,
    tenant_id: TENANT_ID,
    start_time: '2026-04-10T10:00:00Z',
    end_time: '2026-04-10T11:00:00Z',
    status: 'scheduled',
    created_at: '2026-04-10T08:00:00Z',
    calendar_event_id: null,
    calendar_provider: null,
    calendar_connection_id: null,
  }

  // We need the appointments table to handle BOTH the conflict check and the insert
  // The from() mock is called twice for 'appointments':
  //   1st: select().eq('user_id').eq('status') → conflict check
  //   2nd: insert().select().single() → create appointment
  //
  // We'll use a call counter on the from() mock to differentiate
  let callCount = 0

  const conflictProxy = (() => {
    const eqMock2 = vi.fn(() => Promise.resolve({ data: [], error: null }))
    const eqMock1 = vi.fn(() => ({ eq: eqMock2 }))
    const selectMock = vi.fn(() => ({ eq: eqMock1 }))
    return { select: selectMock }
  })()

  const insertSingleMock = vi.fn(() => Promise.resolve({ data: appointmentData, error: null }))
  const insertSelectMock = vi.fn(() => ({ single: insertSingleMock }))
  const insertMock = vi.fn(() => ({ select: insertSelectMock }))

  // Update chain uses .eq() after .update()
  const updateEqMock = vi.fn(() => Promise.resolve({ data: null, error: null }))
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))

  const appointmentProxy = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'select') {
          callCount++
          return conflictProxy.select
        }
        if (prop === 'insert') return insertMock
        if (prop === 'update') return updateMock
        return vi.fn(() => appointmentProxy)
      },
    }
  )

  // Override the from() mock to return our custom proxy for 'appointments'
  mockSupabase.from = vi.fn((table: string) => {
    if (table === 'appointments') return appointmentProxy
    return getTableQuery(table).proxy
  })

  return { appointmentData, insertMock, updateMock }
}

function mockCalendarConnectionActive() {
  mockGetConnectionForSurveyLink.mockResolvedValue(
    ok({
      id: CONNECTION_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
      provider: 'google',
      displayName: 'Work Calendar',
      credentials: {
        access_token: 'token',
        refresh_token: 'refresh',
        expiry_date: Date.now() + 3600000,
        scope: 'calendar',
        email: 'test@gmail.com',
      },
      calendarUrl: null,
      accountIdentifier: 'test@gmail.com',
      isDefault: true,
      isActive: true,
    })
  )
}

function mockCalendarEventCreated(eventId = 'cal-event-123') {
  mockCreateEvent.mockResolvedValue(ok({ eventId }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bookAppointment', () => {
  beforeEach(() => {
    // Reset table queries
    Object.keys(tableQueries).forEach((key) => delete tableQueries[key])
    mockFetch.mockClear()
    mockGetConnectionForSurveyLink.mockReset()
    mockCreateCalendarProvider.mockClear()
    mockCreateEvent.mockReset()
    mockRpc.mockReset()
    // Reset from() to default behavior
    mockSupabase.from = vi.fn((table: string) => getTableQuery(table).proxy)
  })

  // -------------------------------------------------------------------------
  // 1. Happy path: successful booking with calendar event
  // -------------------------------------------------------------------------

  it('creates appointment and calendar event on happy path', async () => {
    mockSurveyLinkFound()
    mockResponseFound()
    const { appointmentData } = mockAppointmentCreated()
    mockCalendarConnectionActive()
    mockCalendarEventCreated('cal-event-456')

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.appointment.id).toBe(APPOINTMENT_ID)
    expect(result.data.appointment.clientName).toBe('Jan Kowalski')
    expect(result.data.appointment.status).toBe('scheduled')
    expect(result.data.confirmationUrl).toContain(`/survey/${SURVEY_LINK_ID}/success`)
    expect(result.data.confirmationUrl).toContain(`appointmentId=${APPOINTMENT_ID}`)
  })

  // -------------------------------------------------------------------------
  // 2. Successful booking WITHOUT calendar (no calendar_connection_id)
  // -------------------------------------------------------------------------

  it('creates appointment without calendar when no connection exists', async () => {
    mockSurveyLinkFound()
    mockResponseFound()
    mockAppointmentCreated()

    // No calendar connection
    mockGetConnectionForSurveyLink.mockResolvedValue(
      err('No calendar connection for survey link')
    )

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.appointment.id).toBe(APPOINTMENT_ID)
    // Calendar provider should NOT have been called
    expect(mockCreateCalendarProvider).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 3. Graceful degradation: calendar event fails, appointment still saved
  // -------------------------------------------------------------------------

  it('saves appointment even when calendar event creation fails', async () => {
    mockSurveyLinkFound()
    mockResponseFound()
    mockAppointmentCreated()
    mockCalendarConnectionActive()

    // Calendar event creation fails
    mockCreateEvent.mockResolvedValue(err('Google API error'))

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.appointment.id).toBe(APPOINTMENT_ID)
    // Provider was called but failed — appointment still created
    expect(mockCreateCalendarProvider).toHaveBeenCalled()
    expect(mockCreateEvent).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 4. Double-booking conflict detection
  // -------------------------------------------------------------------------

  it('rejects booking when time slot has a conflict', async () => {
    mockSurveyLinkFound()
    mockResponseFound()

    // Existing appointment overlaps with the requested time
    const conflictData = [
      {
        id: 'existing-apt',
        start_time: '2026-04-10T09:30:00Z',
        end_time: '2026-04-10T10:30:00Z',
      },
    ]

    // Set up appointments table to return conflict on select
    const eqMock2 = vi.fn(() => Promise.resolve({ data: conflictData, error: null }))
    const eqMock1 = vi.fn(() => ({ eq: eqMock2 }))
    const selectMock = vi.fn(() => ({ eq: eqMock1 }))

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'appointments') return { select: selectMock }
      return getTableQuery(table).proxy
    })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('SLOT_UNAVAILABLE')
    expect(result.error.status).toBe(409)
  })

  // -------------------------------------------------------------------------
  // 5. Survey not found
  // -------------------------------------------------------------------------

  it('returns SURVEY_NOT_FOUND when survey link does not exist', async () => {
    tableQueries['survey_links'] = createChainableQuery({
      data: null,
      error: { message: 'not found', code: 'PGRST116' },
    })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('SURVEY_NOT_FOUND')
    expect(result.error.status).toBe(404)
  })

  // -------------------------------------------------------------------------
  // 6. Response not found / doesn't belong to survey
  // -------------------------------------------------------------------------

  it('returns RESPONSE_NOT_FOUND when response does not match survey', async () => {
    mockSurveyLinkFound()

    tableQueries['responses'] = createChainableQuery({
      data: null,
      error: { message: 'not found', code: 'PGRST116' },
    })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('RESPONSE_NOT_FOUND')
    expect(result.error.status).toBe(404)
  })

  // -------------------------------------------------------------------------
  // 6b. AAA-T-63 (Commit 9 / Iter 1): response.answers missing client_email
  // role — must fail strictly (not fall back to "first answer").
  // -------------------------------------------------------------------------

  it('returns RESPONSE_MISSING_CLIENT_DATA when answers do not cover client_email role', async () => {
    mockSurveyLinkFound()
    // Only the client_name role is answered — client_email role question
    // exists in `surveys.questions` but the respondent left it blank.
    mockResponseFound({ answers: { [Q_NAME_ID]: 'Jan Kowalski' } })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('RESPONSE_MISSING_CLIENT_DATA')
    expect(result.error.status).toBe(422)
  })

  it('returns RESPONSE_MISSING_CLIENT_DATA when answers do not cover client_name role', async () => {
    mockSurveyLinkFound()
    mockResponseFound({ answers: { [Q_EMAIL_ID]: 'jan@test.pl' } })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('RESPONSE_MISSING_CLIENT_DATA')
    expect(result.error.status).toBe(422)
  })

  // -------------------------------------------------------------------------
  // 7. Workflow trigger fires after successful booking
  // -------------------------------------------------------------------------

  it('fires booking_created workflow trigger after successful appointment', async () => {
    mockSurveyLinkFound(BOOKING_WORKFLOW_ID)
    mockResponseFound()
    mockAppointmentCreated()
    mockGetConnectionForSurveyLink.mockResolvedValue(err('No connection'))

    await bookAppointment(mockSupabase as any, validBookingRequest())

    // Wait for fire-and-forget fetch to be called
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://cms.test.com/api/workflows/trigger')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-secret')

    const body = JSON.parse(options.body)
    expect(body.trigger_type).toBe('booking_created')
    expect(body.tenant_id).toBe(TENANT_ID)
    expect(body.workflow_id).toBe(BOOKING_WORKFLOW_ID)
    expect(body.payload.appointmentId).toBe(APPOINTMENT_ID)
    expect(body.payload.responseId).toBe(RESPONSE_ID)
    expect(body.payload.surveyLinkId).toBe(SURVEY_LINK_ID)
    // AAA-T-63 Commit 7: trigger payload carries IDs only — no clientEmail/appointmentAt.
    // Hydration of appointment data happens via explicit get_appointment step (Commit 8).
    expect(body.payload).not.toHaveProperty('clientEmail')
    expect(body.payload).not.toHaveProperty('appointmentAt')
  })

  // -------------------------------------------------------------------------
  // 7b. AAA-T-63: skip workflow trigger dispatch when booking_workflow_id is null
  // -------------------------------------------------------------------------

  it('skips workflow trigger dispatch when booking_workflow_id is null', async () => {
    mockSurveyLinkFound(null)
    mockResponseFound()
    mockAppointmentCreated()
    mockGetConnectionForSurveyLink.mockResolvedValue(err('No connection'))

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    // Appointment still created — only the trigger dispatch is skipped
    expect(result.success).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 8. Inactive calendar connection treated as no connection
  // -------------------------------------------------------------------------

  it('skips calendar event when connection is inactive', async () => {
    mockSurveyLinkFound()
    mockResponseFound()
    mockAppointmentCreated()

    mockGetConnectionForSurveyLink.mockResolvedValue(
      ok({
        id: CONNECTION_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
        provider: 'google',
        displayName: 'Disabled Calendar',
        credentials: { access_token: 'x', refresh_token: 'x', expiry_date: 0, scope: '', email: '' },
        calendarUrl: null,
        accountIdentifier: null,
        isDefault: false,
        isActive: false, // Inactive!
      })
    )

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(true)
    // Provider should NOT be created for inactive connection
    expect(mockCreateCalendarProvider).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 9. Appointment creation failure
  // -------------------------------------------------------------------------

  it('returns APPOINTMENT_CREATION_FAILED when DB insert fails', async () => {
    mockSurveyLinkFound()
    mockResponseFound()

    // Set up appointments for conflict check (no conflicts) + failed insert
    const eqMock2 = vi.fn(() => Promise.resolve({ data: [], error: null }))
    const eqMock1 = vi.fn(() => ({ eq: eqMock2 }))
    const selectConflict = vi.fn(() => ({ eq: eqMock1 }))

    const insertSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'constraint violation' } })
    )
    const insertSelect = vi.fn(() => ({ single: insertSingle }))
    const insertMock = vi.fn(() => ({ select: insertSelect }))

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'appointments') return { select: selectConflict, insert: insertMock }
      return getTableQuery(table).proxy
    })

    const result = await bookAppointment(mockSupabase as any, validBookingRequest())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.code).toBe('APPOINTMENT_CREATION_FAILED')
    expect(result.error.status).toBe(500)
  })

  // -------------------------------------------------------------------------
  // 10. No workflow trigger when env vars missing
  // -------------------------------------------------------------------------

  it('does not fire workflow trigger when CMS_BASE_URL is not set', async () => {
    vi.stubEnv('CMS_BASE_URL', '')

    // Use a populated booking_workflow_id so the env-var guard is the only thing skipping dispatch
    mockSurveyLinkFound(BOOKING_WORKFLOW_ID)
    mockResponseFound()
    mockAppointmentCreated()
    mockGetConnectionForSurveyLink.mockResolvedValue(err('No connection'))

    await bookAppointment(mockSupabase as any, validBookingRequest())

    // fetch should not be called for workflow trigger
    expect(mockFetch).not.toHaveBeenCalled()

    // Restore
    vi.stubEnv('CMS_BASE_URL', 'https://cms.test.com')
  })
})
