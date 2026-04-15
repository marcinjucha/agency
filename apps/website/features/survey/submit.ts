import { createAnonClient } from '@/lib/supabase/anon-server'
import type { TablesInsert } from '@agency/database'
import type { SurveyAnswers } from './types'
import { messages } from '@/lib/messages'

interface SubmitResponseParams {
  linkId: string
  surveyId: string
  answers: SurveyAnswers
}

export interface SubmitResponseResult {
  success: boolean
  error?: string
  responseId?: string
  linkId?: string
  httpStatus?: number
}

export async function submitResponse({
  linkId,
  surveyId,
  answers,
}: SubmitResponseParams): Promise<SubmitResponseResult> {
  const supabase = createAnonClient()

  // Step 1: Get tenant_id + workflow_id from survey link and survey in a single query
  const { data: linkData, error: linkError } = await (supabase as any)
    .from('survey_links')
    .select('workflow_id, surveys!inner(tenant_id)')
    .eq('id', linkId)
    .single()

  if (linkError || !linkData) {
    console.error('Failed to fetch survey link data:', linkError)
    return { success: false, error: messages.survey.surveyNotFound, httpStatus: 404 }
  }

  const tenantId = (linkData.surveys as { tenant_id: string }).tenant_id
  const workflowId: string | null = linkData.workflow_id ?? null

  // Step 2: Insert response into responses table
  const responseData: TablesInsert<'responses'> = {
    survey_link_id: linkId,
    answers: answers as unknown as TablesInsert<'responses'>['answers'],
    tenant_id: tenantId,
    ai_qualification: null,
    status: 'new',
  }

  const { data: response, error: insertError } = await supabase
    .from('responses')
    .insert(responseData)
    .select('id')
    .single()

  if (insertError || !response) {
    console.error('Failed to insert response:', insertError)
    return { success: false, error: messages.survey.saveFailed, httpStatus: 400 }
  }

  const { id: responseId } = response as { id: string }

  // Trigger n8n AI analysis (fire-and-forget)
  if (process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL) {
    fetch(process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    }).catch(err => console.error('[N8N] AI analysis webhook failed:', err))
  }

  // Trigger n8n form confirmation email (fire-and-forget)
  if (process.env.N8N_WEBHOOK_FORM_CONFIRM_EMAIL_URL) {
    fetch(process.env.N8N_WEBHOOK_FORM_CONFIRM_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    }).catch(err => console.error('[N8N] Email confirmation webhook failed:', err))
  }

  // Trigger CMS workflow engine — only if link has a bound workflow_id (fixes all-workflows-fire bug)
  if (workflowId && process.env.CMS_BASE_URL && process.env.WORKFLOW_TRIGGER_SECRET) {
    fetch(`${process.env.CMS_BASE_URL}/api/workflows/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKFLOW_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({
        trigger_type: 'survey_submitted',
        tenant_id: tenantId,
        payload: { responseId, surveyLinkId: linkId },
        workflow_id: workflowId,
      }),
    }).catch(err => console.error('[Workflow] Trigger failed:', err))
  }

  // Step 3: Increment submission count using database function (non-critical)
  const { error: incrementError } = await supabase.rpc(
    'increment_submission_count',
    { link_id: linkId }
  )

  if (incrementError) {
    console.error('Failed to increment submission count:', incrementError)
  }

  return { success: true, responseId, linkId }
}
