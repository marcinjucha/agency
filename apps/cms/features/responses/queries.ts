import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'
import type { ResponseListItem, ResponseWithRelations, ResponseSurveyLinkContext, Question, AiActionResult } from './types'

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

/**
 * Raw Supabase row for ai_action step execution with workflow join
 * step_type is on workflow_steps, not workflow_step_executions — requires join
 */
type SupabaseAiStepExecutionRow = {
  output_payload: Record<string, unknown>
  completed_at: string | null
  workflow_executions: {
    workflows: {
      name: string
    }
  }
}

/**
 * Raw row shape returned by the step_executions select() query
 * Includes workflow_steps join needed to filter by step_type
 */
type SupabaseStepExecQueryRow = {
  output_payload: unknown
  completed_at: string | null
  workflow_executions: {
    trigger_payload: unknown
    workflows: { name: string }
  }
  workflow_steps: { step_type: string }
}

/**
 * Transform raw Supabase row to AiActionResult
 */
function transformToAiActionResult(row: SupabaseAiStepExecutionRow): AiActionResult {
  return {
    workflowName: row.workflow_executions.workflows.name,
    outputPayload: row.output_payload,
    completedAt: row.completed_at,
  }
}

/**
 * Fetch AI action step results for a specific survey response
 *
 * Two-step query:
 * 1. Find workflow_executions where trigger_payload->>'responseId' = responseId
 *    (Supabase JS doesn't support JSONB sub-field filtering in nested join conditions)
 * 2. Fetch workflow_step_executions for those execution IDs, joining workflow_steps
 *    to filter step_type = 'ai_action', and workflow_executions > workflows for name
 *
 * @param responseId - Response UUID to look up AI results for
 * @returns Array of AI action results ordered by completion time (oldest first)
 * @throws Error if either query fails
 */
export async function getResponseAiActionResults(responseId: string): Promise<AiActionResult[]> {
  const supabase = createClient()

  // Step 1: find executions triggered by this response
  const { data: executions, error: executionsError } = await supabase
    .from('workflow_executions')
    .select('id, trigger_payload')

  if (executionsError) throw executionsError

  if (!executions || executions.length === 0) return []

  // Filter client-side: trigger_payload is Json (JSONB), Supabase JS doesn't support
  // PostgREST's ->>'field' filter syntax on the browser client for computed columns.
  // WHY: Using .filter() or .eq() on a JSONB nested field requires raw PostgREST
  // syntax (e.g., trigger_payload->>responseId=eq.value) which is not exposed by
  // the typed Supabase JS client. Client-side filtering is safe here because RLS
  // limits executions to the authenticated tenant — not an unbounded table scan.
  const matchingIds = executions
    .filter((ex) => {
      const payload = ex as unknown as { id: string; trigger_payload: Record<string, unknown> }
      return payload.trigger_payload?.['responseId'] === responseId
    })
    .map((ex) => (ex as unknown as { id: string }).id)

  if (matchingIds.length === 0) return []

  // Step 2: fetch ai_action step executions for those workflow execution IDs
  // Join workflow_steps to filter by step_type, and workflow_executions > workflows for name
  const { data: stepExecData, error: stepExecError } = await supabase
    .from('workflow_step_executions')
    .select(`
      output_payload,
      completed_at,
      workflow_executions!inner(
        trigger_payload,
        workflows!inner(name)
      ),
      workflow_steps!inner(step_type)
    `)
    .in('execution_id', matchingIds)
    .not('output_payload', 'is', null)
    .order('completed_at', { ascending: true })

  if (stepExecError) throw stepExecError

  // Filter to ai_action steps only — step_type lives on workflow_steps join
  const aiActionRows = (stepExecData as unknown as SupabaseStepExecQueryRow[] || []).filter(
    (row) => row.workflow_steps?.step_type === 'ai_action'
  )

  return aiActionRows.map((row) =>
    transformToAiActionResult({
      output_payload: row.output_payload as Record<string, unknown>,
      completed_at: row.completed_at,
      workflow_executions: {
        workflows: { name: row.workflow_executions.workflows.name },
      },
    })
  )
}
