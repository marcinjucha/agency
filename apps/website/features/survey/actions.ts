/**
 * Survey Form Server Actions
 *
 * Public-facing Server Actions for survey form submission.
 * No authentication required - relies on RLS policies for security.
 *
 * @module apps/website/features/survey/actions
 */

'use server'

import { createAnonClient } from '@/lib/supabase/anon-server'
import type { TablesInsert } from '@agency/database'
import type { SurveyAnswers, SubmissionResult } from './types'

/**
 * Parameters for survey response submission
 */
interface SubmitSurveyParams {
  /** Survey link UUID */
  linkId: string
  /** Survey UUID */
  surveyId: string
  /** User's answers to survey questions */
  answers: SurveyAnswers
}

/**
 * Submit a survey response (PUBLIC - no auth required)
 *
 * Process:
 * 1. Fetch tenant_id from surveys table
 * 2. Insert response into responses table
 * 3. Increment submission count using database function
 *
 * @param params - Survey submission parameters
 * @returns Structured result with success status and responseId or error
 *
 * @example
 * ```typescript
 * const result = await submitSurveyResponse({
 *   linkId: 'uuid-link',
 *   surveyId: 'uuid-survey',
 *   answers: { 'q1': 'answer1', 'q2': ['option1', 'option2'] }
 * })
 *
 * if (result.success) {
 *   // Handle success: result.responseId
 * } else {
 *   // Handle error: result.error
 * }
 * ```
 */
/**
 * @deprecated This Server Action is deprecated. Use API route /api/survey/submit instead.
 * Kept for reference only.
 */
export async function submitSurveyResponse({
  linkId,
  surveyId,
  answers
}: SubmitSurveyParams): Promise<SubmissionResult> {
  try {
    const supabase = createAnonClient()

    // Step 1: Get tenant_id from surveys table
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('tenant_id')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      console.error('Failed to fetch survey tenant_id:', surveyError)
      return {
        success: false,
        error: 'Survey not found. Please try again.'
      }
    }

    // Type assertion for survey data
    const surveyData = survey as { tenant_id: string }

    // Step 2: Insert response into responses table
    const responseData: TablesInsert<'responses'> = {
      survey_link_id: linkId,
      answers: answers as any, // JSONB column accepts plain objects
      tenant_id: surveyData.tenant_id,
      ai_qualification: null,
      status: 'new'
    }

    const { data: response, error: insertError } = await supabase
      .from('responses')
      .insert(responseData as any)
      .select('id')
      .single()

    if (insertError || !response) {
      console.error('Failed to insert response:', insertError)
      return {
        success: false,
        error: 'Failed to save your response. Please try again.'
      }
    }

    // Type assertion for response data
    const responseData_inserted = response as { id: string }

    // Step 3: Increment submission count using database function
    // Non-critical - don't fail submission if increment fails
    const { error: incrementError } = await (supabase.rpc as any)(
      'increment_submission_count',
      { link_id: linkId }
    )

    if (incrementError) {
      // Log error but don't fail submission (counter is informational)
      console.error('Failed to increment submission count:', incrementError)
    }

    return {
      success: true,
      responseId: responseData_inserted.id
    }
  } catch (error) {
    console.error('Unexpected error submitting survey:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}
