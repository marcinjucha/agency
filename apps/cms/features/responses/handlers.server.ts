/**
 * Pure handler exports for responses server functions.
 *
 * WHY a separate `.server.ts` file:
 *   TanStack Start strips `.server.ts` files from the client bundle at compile
 *   time (plugin transform). Pure handler exports sitting next to
 *   `createServerFn(...).handler(handler)` wrappers in `server.ts` would still
 *   be reachable from client imports — the transform only strips the
 *   `.handler(lambda)` body. Server-only imports (server-start, service role,
 *   server-auth) would leak into the browser bundle via `node:async_hooks`.
 *
 *   Moving every pure handler here guarantees the boundary: this file's
 *   imports NEVER reach the client bundle. server.ts becomes a thin RPC
 *   wrapper layer.
 *
 *   Tests import handlers directly from this file — handler API uses positional
 *   args (input objects), not `{ data }` wrappers.
 */

import { okAsync, errAsync, ResultAsync } from 'neverthrow'
import { createServerClient } from '@/lib/supabase/server-start'
import { messages } from '@/lib/messages'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth'
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
// Transform helpers (mirrors logic from former queries.ts)
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

/**
 * Extract output_schema from step_config JSONB.
 * step_config: { output_schema: [{ key, label, type }, ...] }
 * Returns empty array when step_config is absent or malformed.
 */
function extractOutputSchema(stepConfig: unknown): OutputSchemaField[] {
  if (!stepConfig || typeof stepConfig !== 'object') return []
  const config = stepConfig as Record<string, unknown>
  const schema = config['output_schema']
  if (!Array.isArray(schema)) return []
  return schema.filter(
    (f): f is OutputSchemaField =>
      typeof f === 'object' &&
      f !== null &&
      typeof (f as Record<string, unknown>)['key'] === 'string' &&
      typeof (f as Record<string, unknown>)['label'] === 'string',
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
// Handlers — public API consumed by server.ts wrappers and tests
// ---------------------------------------------------------------------------

const LIST_SELECT =
  '*, survey_links(id, token, notification_email, survey_id, surveys(id, title)), appointments(id)'

const DETAIL_SELECT =
  '*, survey_links(id, token, survey_id, surveys(id, title, description, questions)), appointments(id)'

/**
 * Fetch all responses for the authenticated tenant (RLS filters automatically).
 */
export async function getResponsesHandler(): Promise<ResponseListItem[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('responses')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(transformToListItem)
}

/**
 * Fetch a single response by ID with all related data. Returns null if missing.
 */
export async function getResponseHandler(input: { id: string }): Promise<ResponseWithRelations | null> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('responses')
    .select(DETAIL_SELECT)
    .eq('id', input.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return transformToDetailResponse(data)
}

/**
 * Fetch responses for a specific survey link.
 */
export async function getResponsesByLinkHandler(input: { surveyLinkId: string }): Promise<ResponseListItem[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('responses')
    .select(
      '*, survey_links(id, token, notification_email, survey_id, surveys(id, title))',
    )
    .eq('survey_link_id', input.surveyLinkId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(transformToListItem)
}

/**
 * Fetch responses for a specific survey (across all links).
 */
export async function getResponsesBySurveyHandler(input: { surveyId: string }): Promise<ResponseListItem[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('responses')
    .select(
      '*, survey_links!inner(id, token, notification_email, survey_id, surveys(id, title))',
    )
    .eq('survey_links.survey_id', input.surveyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(transformToListItem)
}

/**
 * Total response count for the authenticated tenant.
 */
export async function getResponseCountHandler(): Promise<number> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('responses')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Response count for a specific survey.
 */
export async function getResponseCountBySurveyHandler(input: { surveyId: string }): Promise<number> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('responses')
    .select('*', { count: 'exact', head: true })
    .eq('survey_links.survey_id', input.surveyId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Fetch AI action step results for a response.
 *
 * Two-step query:
 * 1. Fetch workflow_executions and filter client-side by trigger_payload->>'responseId'
 *    (Supabase JS doesn't expose PostgREST nested-join JSONB filter syntax).
 *    Safe because RLS limits executions to the authenticated tenant.
 * 2. Fetch workflow_step_executions joined with workflow_steps + workflows for
 *    those execution IDs, filter to ai_action steps client-side.
 */
export async function getResponseAiActionResultsHandler(input: {
  responseId: string
}): Promise<AiActionResult[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: executions, error: executionsError } = await (supabase as any)
    .from('workflow_executions')
    .select('id, trigger_payload')

  if (executionsError) throw new Error(executionsError.message)
  if (!executions || executions.length === 0) return []

  const matchingIds = executions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((ex: any) => ex.trigger_payload?.['responseId'] === input.responseId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((ex: any) => ex.id)

  if (matchingIds.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepExecData, error: stepExecError } = await (supabase as any)
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

  if (stepExecError) throw new Error(stepExecError.message)

  return (stepExecData ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((row: any) => row.workflow_steps?.step_type === 'ai_action')
    .map(transformToAiActionResult)
}

// ---------------------------------------------------------------------------
// deleteResponse handler (mutation — keeps neverthrow Result pipeline)
// ---------------------------------------------------------------------------

export type DeleteResponseResult =
  | { success: true; hadAppointment: boolean }
  | { success: false; error: string }

export async function deleteResponseHandler(input: { id: string }): Promise<DeleteResponseResult> {
  const result = await requireAuthContext().andThen((auth) =>
    deleteResponseWithCleanup(auth, input.id),
  )

  return result.match(
    ({ hadAppointment }) => ({ success: true as const, hadAppointment }),
    (error) => ({ success: false as const, error }),
  )
}

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
