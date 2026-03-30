/**
 * Survey Data Fetching Queries
 *
 * Server-side data fetching for public survey forms.
 * Uses Supabase anon-server client (NO authentication, NO cookies).
 * All queries include comprehensive business logic validation.
 *
 * @module apps/website/features/survey/queries
 */

import { createAnonClient } from '@/lib/supabase/anon-server'
import type { LinkValidation, Question, SurveyLinkData } from './types'

/**
 * Fetch survey by token with comprehensive validation
 *
 * Validates:
 * - Link exists
 * - Link is active
 * - Link has not expired
 * - Submission limit not reached
 *
 * @param token - Unique survey link token from URL
 * @returns LinkValidation object with validation result and data
 *
 * @example
 * ```typescript
 * const result = await getSurveyByToken('abc123')
 *
 * if (!result.isValid) {
 *   // Show error: result.message
 *   return
 * }
 *
 * // Use survey data: result.data.survey
 * ```
 */
export async function getSurveyByToken(token: string): Promise<LinkValidation> {
  const supabase = createAnonClient()

  // Step 1: Fetch survey link (WITHOUT joining surveys to avoid RLS recursion)
  const { data: link, error: linkError } = await supabase
    .from('survey_links')
    .select(`
      id,
      token,
      survey_id,
      notification_email,
      expires_at,
      max_submissions,
      submission_count,
      is_active
    `)
    .eq('token', token)
    .single()

  // Validation 1: Link not found or query error
  if (linkError || !link) {
    return {
      isValid: false,
      error: 'not_found',
      message: 'Survey link is invalid or does not exist.'
    }
  }

  // Validation 2: Link is inactive (most common check first)
  if (!link.is_active) {
    return {
      isValid: false,
      error: 'inactive',
      message: 'This survey is no longer accepting responses.'
    }
  }

  // Validation 3: Link has expired
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return {
      isValid: false,
      error: 'expired',
      message: 'This survey link has expired.'
    }
  }

  // Validation 4: Submission limit reached
  if (
    link.max_submissions !== null &&
    (link.submission_count ?? 0) >= link.max_submissions
  ) {
    return {
      isValid: false,
      error: 'max_submissions',
      message: 'This survey has reached its submission limit.'
    }
  }

  // Step 2: Fetch survey separately (now that we know link is valid)
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select(`
      id,
      title,
      description,
      questions
    `)
    .eq('id', link.survey_id)
    .single()

  if (surveyError || !survey) {
    return {
      isValid: false,
      error: 'not_found',
      message: 'Survey not found.'
    }
  }

  // Transform data to match SurveyLinkData type
  // Cast questions: JSONB boundary — Supabase returns Json type, we need Question[]
  const surveyData: SurveyLinkData = {
    id: link.id,
    token: link.token,
    survey_id: link.survey_id,
    notification_email: link.notification_email,
    expires_at: link.expires_at,
    max_submissions: link.max_submissions,
    submission_count: link.submission_count,
    is_active: link.is_active,
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions as unknown as Question[]
    }
  }

  return {
    isValid: true,
    data: surveyData
  }
}
