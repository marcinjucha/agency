import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'
import type { SurveyWithLinks } from './types'

export type { SurveyWithLinks }

/**
 * Fetch all surveys for the current user's tenant, with embedded survey_links
 */
export async function getSurveys(): Promise<SurveyWithLinks[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*, survey_links(id, is_active, expires_at, max_submissions, submission_count)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as any as SurveyWithLinks[]) || []
}

/**
 * Fetch a single survey
 * Returns full survey data
 */
export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Survey not found')

  return data
}

/**
 * Fetch survey by token (public access)
 * Used by client survey form
 */
export async function getSurveyByToken(token: string) {
  const supabase = createClient()

  // First get the link
  const { data, error: linkError } = await supabase
    .from('survey_links')
    .select('survey_id')
    .eq('token', token)
    .maybeSingle()

  if (linkError) throw linkError
  if (!data) throw new Error('Survey link not found')

  // Type assertion for Supabase type inference issue
  const link = data as Pick<Tables<'survey_links'>, 'survey_id'>
  const surveyId = link.survey_id

  // Then get the survey
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .maybeSingle()

  if (surveyError) throw surveyError
  if (!survey) throw new Error('Survey not found')

  return survey
}

/**
 * Fetch all links for a specific survey
 * Returns links ordered by creation date (newest first)
 */
export async function getSurveyLinks(surveyId: string): Promise<Tables<'survey_links'>[]> {
  const supabase = createClient()

  const { data, error } = await (supabase as any)
    .from('survey_links')
    .select('*, workflow_id')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
