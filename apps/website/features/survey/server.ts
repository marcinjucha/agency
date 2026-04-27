import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import { messages } from '@/lib/messages'
import type { LinkValidation, Question, SurveyLinkData } from './types'
import type { TablesInsert } from '@agency/database'
import type { SurveyAnswers } from './types'

// ---------------------------------------------------------------------------
// getSurveyByTokenFn
// Loads survey by public token with full business-logic validation.
// Returns LinkValidation (isValid: true | false).
// ---------------------------------------------------------------------------

export const getSurveyByTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }): Promise<LinkValidation> => {
    const supabase = createServiceClient()

    // Step 1: Fetch survey link
    const { data: link, error: linkError } = await (supabase as any)
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
      .eq('token', data.token)
      .single()

    if (linkError || !link) {
      return {
        isValid: false,
        error: 'not_found',
        message: messages.survey.errorNotFound,
      }
    }

    if (!link.is_active) {
      return {
        isValid: false,
        error: 'inactive',
        message: messages.survey.errorInactive,
      }
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return {
        isValid: false,
        error: 'expired',
        message: messages.survey.errorExpired,
      }
    }

    if (
      link.max_submissions !== null &&
      (link.submission_count ?? 0) >= link.max_submissions
    ) {
      return {
        isValid: false,
        error: 'max_submissions',
        message: messages.survey.errorMaxSubmissions,
      }
    }

    // Step 2: Fetch survey separately
    const { data: survey, error: surveyError } = await (supabase as any)
      .from('surveys')
      .select(`id, title, description, questions`)
      .eq('id', link.survey_id)
      .single()

    if (surveyError || !survey) {
      return {
        isValid: false,
        error: 'not_found',
        message: messages.survey.errorSurveyNotFound,
      }
    }

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
        questions: survey.questions as unknown as Question[],
      },
    }

    return { isValid: true, data: surveyData }
  })

// ---------------------------------------------------------------------------
// submitResponseFn
// Inserts survey response and fires 3 fire-and-forget webhooks.
// ---------------------------------------------------------------------------

interface SubmitResponseInput {
  linkId: string
  surveyId: string
  answers: SurveyAnswers
}

export interface SubmitResponseResult {
  success: boolean
  error?: string
  responseId?: string
  linkId?: string
}

export const submitResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SubmitResponseInput) => input)
  .handler(async ({ data }: { data: SubmitResponseInput }): Promise<SubmitResponseResult> => {
    const supabase = createServiceClient()

    // Fetch tenant_id + workflow_id from survey link
    const { data: linkData, error: linkError } = await (supabase as any)
      .from('survey_links')
      .select('workflow_id, surveys!inner(tenant_id)')
      .eq('id', data.linkId)
      .single()

    if (linkError || !linkData) {
      console.error('Failed to fetch survey link data:', linkError)
      return { success: false, error: messages.survey.surveyNotFound }
    }

    const tenantId = (linkData.surveys as { tenant_id: string }).tenant_id
    const workflowId: string | null = linkData.workflow_id ?? null

    // Insert response
    const responseData: TablesInsert<'responses'> = {
      survey_link_id: data.linkId,
      answers: data.answers as unknown as TablesInsert<'responses'>['answers'],
      tenant_id: tenantId,
      ai_qualification: null,
      status: 'new',
    }

    const { data: response, error: insertError } = await (supabase as any)
      .from('responses')
      .insert(responseData)
      .select('id')
      .single()

    if (insertError || !response) {
      console.error('Failed to insert response:', insertError)
      return { success: false, error: messages.survey.saveFailed }
    }

    const responseId = (response as { id: string }).id

    // Fire-and-forget: CMS workflow engine (only if link has bound workflow).
    // Note: AI analysis and confirmation email are now part of the workflow itself
    // (ai_action + send_email steps). The standalone webhook calls were removed 2026-04-27.
    // Delayed 500ms to ensure the just-committed response row is visible through PgBouncer
    // before the Trigger Handler / get_response Handler queries Supabase REST.
    if (workflowId && process.env.CMS_BASE_URL && process.env.WORKFLOW_TRIGGER_SECRET) {
      const workflowTriggerBody = JSON.stringify({
        trigger_type: 'survey_submitted',
        tenant_id: tenantId,
        payload: { responseId, surveyLinkId: data.linkId },
        workflow_id: workflowId,
      })
      setTimeout(() => {
        fetch(`${process.env.CMS_BASE_URL}/api/workflows/trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.WORKFLOW_TRIGGER_SECRET}`,
          },
          body: workflowTriggerBody,
        }).catch(err => console.error('[Workflow] Trigger failed:', err))
      }, 500)
    }

    // Increment submission count (non-critical)
    const { error: incrementError } = await (supabase as any).rpc(
      'increment_submission_count',
      { link_id: data.linkId }
    )
    if (incrementError) {
      console.error('Failed to increment submission count:', incrementError)
    }

    return { success: true, responseId, linkId: data.linkId }
  })

// ---------------------------------------------------------------------------
// getSurveyLinkCalendarStatusFn
// Returns true if calendar_connection_id is set on the link.
// ---------------------------------------------------------------------------

export const getSurveyLinkCalendarStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { linkId: string }) => input)
  .handler(async ({ data }): Promise<boolean> => {
    try {
      const supabase = createServiceClient()
      const { data: link, error } = await (supabase as any)
        .from('survey_links')
        .select('calendar_connection_id')
        .eq('id', data.linkId)
        .single()

      if (error || !link) return false
      return link.calendar_connection_id !== null
    } catch {
      return false
    }
  })
