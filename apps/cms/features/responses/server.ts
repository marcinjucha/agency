import { createServerFn } from '@tanstack/react-start'
import { okAsync, errAsync, ResultAsync } from 'neverthrow'
import { messages } from '@/lib/messages'
import { getAuth, requireAuthContext, type AuthContext } from '@/lib/server-auth'
import type {
  ResponseListItem,
  ResponseWithRelations,
  ResponseSurveyLinkContext,
  AiActionResult,
  OutputSchemaField,
} from './types'

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Transform helpers (mirrors queries.ts transforms)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformToListItem(data: any): ResponseListItem {
  return {
    id: data.id,
    status: data.status,
    created_at: data.created_at,
    survey_links: { survey_id: data.survey_links?.survey_id || '' },
    surveys: { title: data.survey_links?.surveys?.title || 'Unknown Survey' },
    has_appointment: !!(data.appointments && data.appointments.length > 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformToDetailResponse(data: any): ResponseWithRelations {
  const surveyLinkContext: ResponseSurveyLinkContext | undefined = data.survey_links
    ? { id: data.survey_links.id, token: data.survey_links.token, survey_id: data.survey_links.survey_id }
    : undefined

  return {
    id: data.id,
    survey_link_id: data.survey_link_id,
    tenant_id: data.tenant_id,
    answers: (data.answers ?? {}) as ResponseWithRelations['answers'],
    ai_qualification: (data.ai_qualification ?? null) as ResponseWithRelations['ai_qualification'],
    status: data.status as ResponseWithRelations['status'],
    created_at: data.created_at,
    updated_at: data.updated_at,
    survey_links: surveyLinkContext,
    surveys: data.survey_links?.surveys
      ? ({
          id: data.survey_links.surveys.id,
          title: data.survey_links.surveys.title,
          description: data.survey_links.surveys.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questions: (data.survey_links.surveys.questions ?? []) as any,
        } as ResponseWithRelations['surveys'])
      : undefined,
    has_appointment: !!(data.appointments && data.appointments.length > 0),
  }
}

function extractOutputSchema(stepConfig: unknown): OutputSchemaField[] {
  if (!stepConfig || typeof stepConfig !== 'object') return []
  const config = stepConfig as Record<string, unknown>
  const schema = config['output_schema']
  if (!Array.isArray(schema)) return []
  return schema.filter(
    (f): f is OutputSchemaField =>
      typeof f === 'object' && f !== null &&
      typeof (f as Record<string, unknown>)['key'] === 'string' &&
      typeof (f as Record<string, unknown>)['label'] === 'string'
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformToAiActionResult(row: any): AiActionResult {
  return {
    workflowName: row.workflow_executions.workflows.name,
    outputPayload: row.output_payload as Record<string, unknown>,
    completedAt: row.completed_at,
    outputSchema: extractOutputSchema(row.workflow_steps?.step_config),
  }
}

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Fetch all responses for the authenticated tenant.
 * Mirrors getResponses from queries.ts but uses server client.
 */
export const getResponsesFn = createServerFn({ method: 'POST' }).handler(async (): Promise<ResponseListItem[]> => {
  const auth = await getAuth()
  if (!auth) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from('responses')
    .select('*, survey_links(id, token, notification_email, survey_id, surveys(id, title)), appointments(id)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(transformToListItem)
})

/**
 * Fetch a single response by ID with all related data.
 * Mirrors getResponse from queries.ts but uses server client.
 */
export const getResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: { id } }): Promise<ResponseWithRelations | null> => {
    const auth = await getAuth()
    if (!auth) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (auth.supabase as any)
      .from('responses')
      .select('*, survey_links(id, token, survey_id, surveys(id, title, description, questions)), appointments(id)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return transformToDetailResponse(data)
  })

/**
 * Fetch AI action step results for a response.
 * Mirrors getResponseAiActionResults from queries.ts but uses server client.
 * Server-side JSONB filtering via PostgREST filter syntax.
 */
export const getResponseAiActionResultsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { responseId: string }) => input)
  .handler(async ({ data: { responseId } }): Promise<AiActionResult[]> => {
    const auth = await getAuth()
    if (!auth) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = auth.supabase as any

    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('id, trigger_payload')

    if (executionsError) throw executionsError
    if (!executions || executions.length === 0) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchingIds = executions
      .filter((ex: any) => ex.trigger_payload?.['responseId'] === responseId)
      .map((ex: any) => ex.id)

    if (matchingIds.length === 0) return []

    const { data: stepExecData, error: stepExecError } = await supabase
      .from('workflow_step_executions')
      .select(`
        output_payload,
        completed_at,
        workflow_executions!inner(trigger_payload, workflows!inner(name)),
        workflow_steps!inner(step_type, step_config)
      `)
      .in('execution_id', matchingIds)
      .not('output_payload', 'is', null)
      .order('completed_at', { ascending: true })

    if (stepExecError) throw stepExecError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (stepExecData || [])
      .filter((row: any) => row.workflow_steps?.step_type === 'ai_action')
      .map(transformToAiActionResult)
  })

/**
 * Delete a response, checking for and removing linked appointment first.
 * TanStack Start port of features/responses/actions.ts#deleteResponse.
 */
export const deleteResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string; hadAppointment?: boolean }> => {
      const result = await requireAuthContext().andThen((auth) =>
        deleteResponseWithCleanup(auth, data.id),
      )

      return result.match(
        ({ hadAppointment }) => ({ success: true, hadAppointment }),
        (error) => ({ success: false, error }),
      )
    },
  )

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function deleteResponseWithCleanup(auth: AuthContext, responseId: string) {
  return checkLinkedAppointment(auth, responseId).andThen(({ appointmentExists }) =>
    (appointmentExists ? deleteAppointment(auth, responseId) : okAsync(undefined)).andThen(() =>
      deleteResponseRow(auth, responseId).map(() => ({ hadAppointment: appointmentExists })),
    ),
  )
}

function checkLinkedAppointment(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('appointments').select('id').eq('response_id', responseId).maybeSingle(),
    dbError,
  ).andThen(({ data, error }) => {
    if (error) return errAsync(error.message)
    return okAsync({ appointmentExists: !!data })
  })
}

function deleteAppointment(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('appointments').delete().eq('response_id', responseId),
    dbError,
  ).andThen(({ error }) => {
    if (error) return errAsync(error.message)
    return okAsync(undefined)
  })
}

function deleteResponseRow(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('responses').delete().eq('id', responseId),
    dbError,
  ).andThen(({ error }) => {
    if (error) return errAsync(error.message)
    return okAsync(undefined)
  })
}
