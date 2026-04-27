import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Defense-in-depth: payload.surveyLinkId must reference an actual
 * survey_links.id (not a survey_links.token). Both are UUIDs in this
 * system, so a confused caller can silently send the wrong one and the
 * downstream Trigger Handler will fail to hydrate variables.
 *
 * Tenant scope: survey_links has no tenant_id column. We join via the
 * surveys table — survey_links.survey_id -> surveys.id -> surveys.tenant_id.
 */

const SURVEY_TRIGGER_TYPES = new Set(['survey_submitted', 'booking_created'])

type ValidationResult = ResultAsync<{ valid: true }, string>

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client suffices
type AnySupabase = SupabaseClient<any, any, any>

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : 'survey_links lookup failed'

export function validateSurveyLinkIdInPayload(
  supabase: AnySupabase,
  triggerType: string,
  payload: Record<string, unknown>,
  tenantId: string,
): ValidationResult {
  if (!SURVEY_TRIGGER_TYPES.has(triggerType)) {
    return okAsync({ valid: true })
  }

  const surveyLinkId = payload.surveyLinkId
  if (typeof surveyLinkId !== 'string' || surveyLinkId.length === 0) {
    return okAsync({ valid: true })
  }

  return findLinkSurveyId(supabase, 'id', surveyLinkId)
    .andThen((surveyId) =>
      surveyId
        ? verifyTenantOwnership(supabase, surveyId, tenantId)
        : okAsync(false as boolean),
    )
    .andThen((idMatched) => {
      if (idMatched) return okAsync({ valid: true } as const)
      return findLinkSurveyId(supabase, 'token', surveyLinkId)
        .andThen((surveyId) =>
          surveyId
            ? verifyTenantOwnership(supabase, surveyId, tenantId)
            : okAsync(false as boolean),
        )
        .andThen((tokenMatched): ValidationResult => {
          if (tokenMatched) {
            return errAsync(
              'surveyLinkId is a token, not an id — payload sent the wrong UUID',
            )
          }
          return errAsync(
            'surveyLinkId does not match any survey_link.id or .token for this tenant',
          )
        })
    })
}

// ---------------------------------------------------------------------------
// Helpers — tenant scope via JOIN to surveys (survey_links has no tenant_id)
// ---------------------------------------------------------------------------

function findLinkSurveyId(
  supabase: AnySupabase,
  column: 'id' | 'token',
  value: string,
): ResultAsync<string | null, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('survey_links')
      .select('survey_id')
      .eq(column, value)
      .maybeSingle() as Promise<{
      data: { survey_id: string } | null
      error: { message: string } | null
    }>,
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    return okAsync(res.data?.survey_id ?? null)
  })
}

function verifyTenantOwnership(
  supabase: AnySupabase,
  surveyId: string,
  tenantId: string,
): ResultAsync<boolean, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('surveys')
      .select('tenant_id')
      .eq('id', surveyId)
      .eq('tenant_id', tenantId)
      .maybeSingle() as Promise<{
      data: { tenant_id: string } | null
      error: { message: string } | null
    }>,
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    return okAsync(Boolean(res.data))
  })
}
