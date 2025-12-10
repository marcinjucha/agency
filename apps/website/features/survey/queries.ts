/**
 * Survey Data Fetching Queries
 *
 * Browser-side data fetching for public survey forms.
 * Uses Supabase browser client (NO authentication required).
 * All queries include comprehensive business logic validation.
 *
 * @module apps/website/features/survey/queries
 */

import { createClient } from '@/lib/supabase/client'
import type { LinkValidation, SurveyLinkData } from './types'

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
  const supabase = createClient()

  // Step 1: Fetch survey link (WITHOUT joining surveys to avoid RLS recursion)
  const { data: link, error: linkError } = await supabase
    .from('survey_links')
    .select(`
      id,
      token,
      survey_id,
      client_email,
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

  const typedLink = link as any

  // Validation 2: Link is inactive (most common check first)
  if (!typedLink.is_active) {
    return {
      isValid: false,
      error: 'inactive',
      message: 'This survey is no longer accepting responses.'
    }
  }

  // Validation 3: Link has expired
  if (typedLink.expires_at && new Date(typedLink.expires_at) < new Date()) {
    return {
      isValid: false,
      error: 'expired',
      message: 'This survey link has expired.'
    }
  }

  // Validation 4: Submission limit reached
  if (
    typedLink.max_submissions !== null &&
    (typedLink.submission_count ?? 0) >= typedLink.max_submissions
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
    .eq('id', typedLink.survey_id)
    .single()

  if (surveyError || !survey) {
    return {
      isValid: false,
      error: 'not_found',
      message: 'Survey not found.'
    }
  }

  // Transform data to match SurveyLinkData type
  const surveyData: SurveyLinkData = {
    id: typedLink.id,
    token: typedLink.token,
    survey_id: typedLink.survey_id,
    client_email: typedLink.client_email,
    expires_at: typedLink.expires_at,
    max_submissions: typedLink.max_submissions,
    submission_count: typedLink.submission_count,
    is_active: typedLink.is_active,
    survey: {
      id: (survey as any).id,
      title: (survey as any).title,
      description: (survey as any).description,
      questions: (survey as any).questions
    }
  }

  return {
    isValid: true,
    data: surveyData
  }
}
