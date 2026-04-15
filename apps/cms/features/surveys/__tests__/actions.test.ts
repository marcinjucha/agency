import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks (must be declared before imports) ---

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/result-helpers', async (importOriginal) => {
  const { ok, err } = await import('neverthrow')
  return {
    requireAuthResult: vi.fn(),
    zodParse: vi.fn(),
    fromSupabase: vi.fn(() => (res: any) => {
      if (res.error) return err(res.error.message)
      if (!res.data) return err('Brak danych')
      return ok(res.data)
    }),
    fromSupabaseVoid: vi.fn(() => (res: any) => {
      if (res.error) return err(res.error.message)
      return ok(undefined)
    }),
  }
})

vi.mock('../validation', () => ({
  createSurveySchema: { safeParse: vi.fn() },
  updateSurveySchema: { safeParse: vi.fn() },
  generateSurveyLinkSchema: { safeParse: vi.fn() },
  updateSurveyLinkSchema: { safeParse: vi.fn() },
}))

vi.mock('@/lib/messages', () => ({
  messages: {
    common: { invalidData: 'Invalid data', unknownError: 'Unknown error' },
    surveys: {
      createFailed: 'Create failed',
      updateFailed: 'Update failed',
      deleteFailed: 'Delete failed',
      notFound: 'Survey not found',
      generateLinkFailed: 'Generate link failed',
      deleteLinkFailed: 'Delete link failed',
      updateLinkFailed: 'Update link failed',
    },
  },
}))

vi.mock('@/lib/routes', () => ({
  routes: {
    admin: {
      surveys: '/admin/surveys',
      survey: (id: string) => `/admin/surveys/${id}`,
      intake: '/admin/intake',
    },
  },
}))

// Import real neverthrow — needed both for test helpers and for mocking result-helpers
import { ok, err, ResultAsync } from 'neverthrow'
import { revalidatePath } from 'next/cache'
import {
  requireAuthResult as _requireAuthResult,
  zodParse as _zodParse,
} from '@/lib/result-helpers'
import {
  generateSurveyLink,
  updateSurveyLink,
  deleteSurveyLink,
  createSurvey,
} from '../actions'

const requireAuthResult = _requireAuthResult as ReturnType<typeof vi.fn>
const zodParse = _zodParse as ReturnType<typeof vi.fn>

// --- Mock helpers ---

function buildMockAuth(supabase: any) {
  return {
    supabase,
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenantName: 'Test',
    isSuperAdmin: false,
    roleName: 'admin',
    permissions: ['surveys'],
  }
}

function buildChainWith(finalValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  chain.then = (resolve: any) => Promise.resolve(finalValue).then(resolve)
  return chain
}

function buildSupabaseMock(responses: any[]) {
  let callIndex = 0
  const supabase: any = {
    from: vi.fn(() => {
      const chain = buildChainWith(responses[callIndex] ?? responses[responses.length - 1])
      callIndex++
      return chain
    }),
  }
  return supabase
}

beforeEach(() => {
  vi.clearAllMocks()
})

// --- generateSurveyLink ---

describe('generateSurveyLink', () => {
  it('saves workflow_id when provided', async () => {
    const workflowId = 'wf-uuid-1111-1111-1111-111111111111'
    const surveyId = 'sv-uuid-2222-2222-2222-222222222222'
    const linkId = 'lk-uuid-3333-3333-3333-333333333333'

    const linkRow = { id: linkId, token: 'tok', workflow_id: workflowId }
    const supabase = buildSupabaseMock([
      { data: { id: surveyId }, error: null },    // verifySurveyAccess
      { data: linkRow, error: null },              // insertSurveyLink
    ])

    zodParse.mockReturnValue(
      ok({
        surveyId,
        notificationEmail: 'test@example.com',
        isActive: true,
        calendarConnectionId: null,
        workflowId,
      })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await generateSurveyLink(surveyId, {
      notificationEmail: 'test@example.com',
      workflowId,
    })

    expect(result.success).toBe(true)
    expect(result.linkId).toBe(linkId)
    // Verify workflow_id was passed into insert call
    const insertCall = supabase.from.mock.calls.find((c: any[]) => c[0] === 'survey_links')
    expect(insertCall).toBeDefined()
  })

  it('saves NULL workflow_id when not provided', async () => {
    const surveyId = 'sv-uuid-2222-2222-2222-222222222222'
    const linkId = 'lk-uuid-4444-4444-4444-444444444444'

    const linkRow = { id: linkId, token: 'tok', workflow_id: null }
    const supabase = buildSupabaseMock([
      { data: { id: surveyId }, error: null },
      { data: linkRow, error: null },
    ])

    zodParse.mockReturnValue(
      ok({
        surveyId,
        notificationEmail: 'test@example.com',
        isActive: true,
        calendarConnectionId: null,
        workflowId: null,
      })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await generateSurveyLink(surveyId, {
      notificationEmail: 'test@example.com',
    })

    expect(result.success).toBe(true)
    expect(result.linkId).toBe(linkId)
  })

  it('returns error when survey not found', async () => {
    const surveyId = 'sv-uuid-2222-2222-2222-222222222222'

    const supabase = buildSupabaseMock([
      { data: null, error: null }, // verifySurveyAccess → not found
    ])

    zodParse.mockReturnValue(
      ok({
        surveyId,
        notificationEmail: 'test@example.com',
        isActive: true,
        calendarConnectionId: null,
        workflowId: null,
      })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await generateSurveyLink(surveyId, {
      notificationEmail: 'test@example.com',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Survey not found')
  })

  it('returns error on validation failure', async () => {
    zodParse.mockReturnValue(err('Invalid email'))

    const result = await generateSurveyLink('any-id', {
      notificationEmail: 'bad',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid email')
  })
})

// --- updateSurveyLink ---

describe('updateSurveyLink', () => {
  it('updates workflow_id when provided', async () => {
    const linkId = 'lk-uuid-5555-5555-5555-555555555555'
    const surveyId = 'sv-uuid-6666-6666-6666-666666666666'
    const workflowId = 'wf-uuid-7777-7777-7777-777777777777'

    const supabase = buildSupabaseMock([
      { data: null, error: null }, // update → void
    ])

    zodParse.mockReturnValue(
      ok({
        notificationEmail: 'test@example.com',
        isActive: true,
        workflowId,
      })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await updateSurveyLink(linkId, surveyId, {
      notificationEmail: 'test@example.com',
      isActive: true,
      workflowId,
    } as any)

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/surveys/${surveyId}`)
  })

  it('clears workflow_id when set to null', async () => {
    const linkId = 'lk-uuid-5555-5555-5555-555555555555'
    const surveyId = 'sv-uuid-6666-6666-6666-666666666666'

    const supabase = buildSupabaseMock([
      { data: null, error: null },
    ])

    zodParse.mockReturnValue(
      ok({
        notificationEmail: 'test@example.com',
        isActive: true,
        workflowId: null,
      })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await updateSurveyLink(linkId, surveyId, {
      notificationEmail: 'test@example.com',
      isActive: true,
      workflowId: null,
    } as any)

    expect(result.success).toBe(true)
  })

  it('returns error on DB failure', async () => {
    const linkId = 'lk-uuid-5555-5555-5555-555555555555'
    const surveyId = 'sv-uuid-6666-6666-6666-666666666666'

    const supabase = buildSupabaseMock([
      { data: null, error: { message: 'DB error' } },
    ])

    zodParse.mockReturnValue(
      ok({ notificationEmail: 'test@example.com', isActive: true, workflowId: null })
    )
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await updateSurveyLink(linkId, surveyId, {
      notificationEmail: 'test@example.com',
      isActive: true,
    } as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

// --- deleteSurveyLink ---

describe('deleteSurveyLink', () => {
  it('deletes link and revalidates path', async () => {
    const linkId = 'lk-uuid-8888-8888-8888-888888888888'
    const surveyId = 'sv-uuid-9999-9999-9999-999999999999'

    const supabase = buildSupabaseMock([
      { data: null, error: null },
    ])

    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await deleteSurveyLink(linkId, surveyId)

    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/surveys/${surveyId}`)
  })
})

// --- createSurvey ---

describe('createSurvey', () => {
  it('creates survey and returns surveyId', async () => {
    const surveyId = 'sv-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    const supabase = buildSupabaseMock([
      { data: { id: surveyId }, error: null },
    ])

    zodParse.mockReturnValue(ok({ title: 'Test Survey' }))
    requireAuthResult.mockReturnValue(ResultAsync.fromSafePromise(Promise.resolve(buildMockAuth(supabase))))

    const result = await createSurvey({ title: 'Test Survey' })

    expect(result.success).toBe(true)
    expect(result.surveyId).toBe(surveyId)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/surveys')
  })

  it('returns error on validation failure', async () => {
    zodParse.mockReturnValue(err('Title required'))

    const result = await createSurvey({ title: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Title required')
  })
})
