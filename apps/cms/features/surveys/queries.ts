import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@legal-mind/database'

/**
 * Fetch all surveys for the current user's tenant
 * Type-safe query with full TypeScript autocomplete
 */
export async function getSurveys() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys') // ✅ TypeScript knows: 'tenants' | 'users' | 'surveys' | etc.
    .select('*')     // ✅ TypeScript knows all columns
    .order('created_at', { ascending: false })

  if (error) throw error

  // data is typed as:
  // Array<{
  //   id: string
  //   title: string
  //   description: string | null
  //   tenant_id: string
  //   created_by: string
  //   questions: Json
  //   status: string | null
  //   created_at: string | null
  //   updated_at: string | null
  // }>

  return data
}

/**
 * Fetch a single survey with creator information
 * Demonstrates type-safe joins
 */
export async function getSurvey(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*, created_by(full_name)') // ✅ TypeScript validates join
    .eq('id', id)
    .single()

  if (error) throw error
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
