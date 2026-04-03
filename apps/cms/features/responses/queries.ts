import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'
import type { ResponseListItem, ResponseWithRelations, ResponseSurveyLinkContext, Question } from './types'

/**
 * Raw Supabase response structure from nested join query
 * Matches the select() query structure with nested survey_links and surveys
 */
type SupabaseResponseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & {
    surveys: Tables<'surveys'>
  }) | null
  appointments: { id: string }[] | null
}

/**
 * Transform Supabase nested response to ResponseListItem
 * Converts nested survey_links.surveys structure to flat structure
 * Maintains type safety by explicitly mapping to expected output type
 */
function transformToListItem(data: SupabaseResponseRow): ResponseListItem {
  return {
    id: data.id,
    status: (data.status as ResponseListItem['status']),
    created_at: data.created_at,
    survey_links: {
      survey_id: data.survey_links?.survey_id || '',
    },
    surveys: {
      title: data.survey_links?.surveys?.title || 'Unknown Survey',
    },
    has_appointment: !!(data.appointments && data.appointments.length > 0),
  }
}

/**
 * Fetch all responses for the authenticated user's tenant
 * Returns responses ordered by creation date (newest first)
 * Automatically filtered by RLS policy
 *
 * @returns Array of responses with survey information
 * @throws Error if query fails
 */
export async function getResponses(): Promise<ResponseListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      survey_links(id, token, notification_email, survey_id, surveys(id, title)),
      appointments(id)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as SupabaseResponseRow[] || []).map(transformToListItem)
}

/**
 * Raw Supabase response structure for detail view with full survey data
 */
type SupabaseDetailResponseRow = SupabaseResponseRow

/**
 * Transform Supabase nested response to ResponseWithRelations
 * Converts database row with nested relations to typed response object
 * Uses ResponseSurveyLinkContext for type-safe subset of survey_links data
 */
function transformToDetailResponse(data: SupabaseDetailResponseRow): ResponseWithRelations {
  const surveyLinkContext: ResponseSurveyLinkContext | undefined = data.survey_links
    ? {
        id: data.survey_links.id,
        token: data.survey_links.token,
        survey_id: data.survey_links.survey_id,
      }
    : undefined

  return {
    id: data.id,
    survey_link_id: data.survey_link_id,
    tenant_id: data.tenant_id,
    answers: (data.answers ?? {}) as ResponseWithRelations['answers'],
    ai_qualification: (data.ai_qualification ?? null) as ResponseWithRelations['ai_qualification'],
    status: (data.status as ResponseWithRelations['status']),
    created_at: data.created_at,
    updated_at: data.updated_at,
    survey_links: surveyLinkContext,
    surveys: data.survey_links?.surveys
      ? ({
          id: data.survey_links.surveys.id,
          title: data.survey_links.surveys.title,
          description: data.survey_links.surveys.description,
          questions: (data.survey_links.surveys.questions ?? []) as unknown as Question[],
        } as ResponseWithRelations['surveys'])
      : undefined,
    has_appointment: !!(data.appointments && data.appointments.length > 0),
  }
}

/**
 * Fetch a single response by ID with all related data
 * Returns null if response not found
 * RLS policy ensures only tenant's responses are accessible
 *
 * @param id - Response ID
 * @returns Response with all relations or null if not found
 * @throws Error if query fails
 */
export async function getResponse(id: string): Promise<ResponseWithRelations | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      survey_links(id, token, survey_id, surveys(id, title, description, questions)),
      appointments(id)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return transformToDetailResponse(data as SupabaseDetailResponseRow)
}

/**
 * Fetch responses for a specific survey link
 * Used to show all responses from one survey instance
 *
 * @param surveyLinkId - Survey link ID
 * @returns Array of responses for that link
 * @throws Error if query fails
 */
export async function getResponsesByLink(surveyLinkId: string): Promise<ResponseListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      survey_links(id, token, notification_email, survey_id, surveys(id, title))
    `)
    .eq('survey_link_id', surveyLinkId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as SupabaseResponseRow[] || []).map(transformToListItem)
}

/**
 * Fetch responses for a specific survey
 * Shows all responses across all links for one survey
 *
 * @param surveyId - Survey ID
 * @returns Array of responses for that survey
 * @throws Error if query fails
 */
export async function getResponsesBySurvey(surveyId: string): Promise<ResponseListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      survey_links!inner(id, token, notification_email, survey_id, surveys(id, title))
    `)
    .eq('survey_links.survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as SupabaseResponseRow[] || []).map(transformToListItem)
}

/**
 * Count total responses for the authenticated user's tenant
 * Used for analytics and dashboard
 *
 * @returns Total response count
 * @throws Error if query fails
 */
export async function getResponseCount(): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count || 0
}

/**
 * Count responses for a specific survey
 * Used for survey statistics
 *
 * @param surveyId - Survey ID
 * @returns Response count for that survey
 * @throws Error if query fails
 */
export async function getResponseCountBySurvey(surveyId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true })
    .eq('survey_links.survey_id', surveyId)

  if (error) throw error
  return count || 0
}
