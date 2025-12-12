import { createClient } from '@/lib/supabase/client'
import type { ResponseListItem, ResponseWithRelations } from './types'

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
      survey_link:survey_links(id, token, client_email, survey_id),
      survey:survey_links!inner(survey:surveys(id, title))
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
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
      survey_link:survey_links(*, survey:surveys(*))
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data || null
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
      survey_link:survey_links(id, token, client_email, survey_id),
      survey:survey_links!inner(survey:surveys(id, title))
    `)
    .eq('survey_link_id', surveyLinkId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
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
      survey_link:survey_links(id, token, client_email, survey_id),
      survey:survey_links!inner(survey:surveys(id, title))
    `)
    .eq('survey_links.survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
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
