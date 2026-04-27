import { describe, it, expect, vi } from 'vitest'
import { validateSurveyLinkIdInPayload } from '../trigger-payload-validators'

// ---------------------------------------------------------------------------
// Test helpers — table-aware, query-aware Supabase mock
// ---------------------------------------------------------------------------

type Row = { tenant_id?: string; survey_id?: string }

interface MockConfig {
  /** survey_links rows keyed by id */
  linksById?: Record<string, Row>
  /** survey_links rows keyed by token */
  linksByToken?: Record<string, Row>
  /** surveys rows keyed by id (tenant_id only) */
  surveysById?: Record<string, { tenant_id: string }>
}

function createMockSupabase(config: MockConfig) {
  const from = vi.fn((table: string) => {
    let column = ''
    let value = ''
    let extraColumn = ''
    let extraValue = ''

    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn((col: string, val: string) => {
      if (!column) {
        column = col
        value = val
      } else {
        extraColumn = col
        extraValue = val
      }
      return chain
    })
    chain.maybeSingle = vi.fn(() => {
      if (table === 'survey_links') {
        const map = column === 'id' ? config.linksById : config.linksByToken
        const row = map?.[value]
        return Promise.resolve({ data: row ?? null, error: null })
      }
      if (table === 'surveys') {
        const row = config.surveysById?.[value]
        if (!row) return Promise.resolve({ data: null, error: null })
        // simulate the second .eq('tenant_id', tenantId) filter
        if (extraColumn === 'tenant_id' && row.tenant_id !== extraValue) {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: row, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    return chain
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

const TENANT = 'tenant-1'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateSurveyLinkIdInPayload', () => {
  it('returns valid for non-survey trigger types', async () => {
    const supabase = createMockSupabase({})

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'manual',
      { surveyLinkId: 'whatever' },
      TENANT,
    )

    expect(result.isOk()).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns valid for survey_submitted with no surveyLinkId', async () => {
    const supabase = createMockSupabase({})

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'survey_submitted',
      { responseId: 'r-1' },
      TENANT,
    )

    expect(result.isOk()).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns valid when surveyLinkId matches a real survey_links.id for the tenant', async () => {
    const supabase = createMockSupabase({
      linksById: { 'link-id-1': { survey_id: 'survey-1' } },
      surveysById: { 'survey-1': { tenant_id: TENANT } },
    })

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'survey_submitted',
      { surveyLinkId: 'link-id-1' },
      TENANT,
    )

    expect(result.isOk()).toBe(true)
  })

  it('returns "surveyLinkId is a token" when UUID matches .token but not .id', async () => {
    const supabase = createMockSupabase({
      linksById: {}, // no id match
      linksByToken: { 'token-uuid-1': { survey_id: 'survey-1' } },
      surveysById: { 'survey-1': { tenant_id: TENANT } },
    })

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'survey_submitted',
      { surveyLinkId: 'token-uuid-1' },
      TENANT,
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toMatch(/token, not an id/i)
  })

  it('returns "does not match" when UUID matches neither id nor token', async () => {
    const supabase = createMockSupabase({
      linksById: {},
      linksByToken: {},
      surveysById: {},
    })

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'booking_created',
      { surveyLinkId: 'unknown-uuid' },
      TENANT,
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toMatch(/does not match/i)
  })

  it('rejects cross-tenant id match (link belongs to another tenant)', async () => {
    const supabase = createMockSupabase({
      linksById: { 'link-id-other': { survey_id: 'survey-other' } },
      surveysById: { 'survey-other': { tenant_id: 'other-tenant' } },
      linksByToken: {},
    })

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'survey_submitted',
      { surveyLinkId: 'link-id-other' },
      TENANT,
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toMatch(/does not match/i)
  })

  it('returns valid when surveyLinkId is not a string', async () => {
    const supabase = createMockSupabase({})

    const result = await validateSurveyLinkIdInPayload(
      supabase,
      'survey_submitted',
      { surveyLinkId: 12345 },
      TENANT,
    )

    expect(result.isOk()).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
