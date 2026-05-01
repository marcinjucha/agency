/**
 * Pure handler exports for workflows server functions.
 *
 * WHY a separate `.server.ts` file:
 *   TanStack Start strips `.server.ts` files from the client bundle at compile
 *   time (plugin transform). Pure handler exports sitting next to
 *   `createServerFn(...).handler(handler)` wrappers in `server.ts` would still
 *   be reachable from client imports — server-only modules (server-start,
 *   service role, server-auth) leak via `node:async_hooks`.
 *
 *   Tests import handlers directly from this file — handler API is unchanged.
 */

import { ok, err, ResultAsync } from 'neverthrow'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuthContextFull, hasPermission } from '@/lib/server-auth.server'
import { messages } from '@/lib/messages'
import {
  toWorkflow,
  toWorkflowListItem,
  toWorkflowStep,
  toWorkflowEdge,
  toWorkflowExecution,
  toExecutionWithWorkflow,
  toStepExecutionWithMeta,
  parseWorkflowSnapshot,
  type WorkflowListItem,
  type WorkflowWithSteps,
  type WorkflowExecution,
  type EmailTemplateOption,
  type EmailTemplateWithBody,
  type SurveyOption,
  type ExecutionWithWorkflow,
  type ExecutionWithSteps,
  type StepExecutionWithMeta,
  type ExecutionStatus,
} from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecutionFilters {
  workflowId?: string
  status?: ExecutionStatus
}

export interface WorkflowSelectorOption {
  id: string
  name: string
}

export type RetryWorkflowResult =
  | { ok: true; executionId: string }
  | { ok: false; error: 'forbidden' | 'not_found' | 'conflict' | 'orchestrator_not_configured' | 'dispatch_failed'; message?: string }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIST_FIELDS =
  'id, name, description, trigger_type, is_active, created_at, updated_at' as const

// ---------------------------------------------------------------------------
// Query handlers
// ---------------------------------------------------------------------------

export async function getWorkflowsForSelectorHandler(
  triggerType: string = 'survey_submitted',
): Promise<WorkflowSelectorOption[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select('id, name')
    .eq('is_active', true)
    .eq('trigger_type', triggerType)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as WorkflowSelectorOption[]
}

export async function getWorkflowsHandler(): Promise<WorkflowListItem[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select(LIST_FIELDS)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toWorkflowListItem)
}

export async function getWorkflowHandler(id: string): Promise<WorkflowWithSteps> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflowData, error: workflowError } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (workflowError) throw workflowError
  if (!workflowData) throw new Error(messages.workflows.workflowNotFound)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepsData, error: stepsError } = await (supabase as any)
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', id)
    .order('created_at', { ascending: true })

  if (stepsError) throw stepsError

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: edgesData, error: edgesError } = await (supabase as any)
    .from('workflow_edges')
    .select('*')
    .eq('workflow_id', id)
    .order('sort_order', { ascending: true })

  if (edgesError) throw edgesError

  const workflow = toWorkflow(workflowData)
  return {
    ...workflow,
    steps: (stepsData || []).map(toWorkflowStep),
    edges: (edgesData || []).map(toWorkflowEdge),
  }
}

export async function getWorkflowExecutionsHandler(
  workflowId: string,
  options?: { limit?: number; offset?: number; excludeDryRuns?: boolean },
): Promise<WorkflowExecution[]> {
  const supabase = createServerClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('workflow_executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.excludeDryRuns !== false) {
    query = query.eq('is_dry_run', false)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(toWorkflowExecution)
}

export async function getEmailTemplatesForWorkflowHandler(): Promise<
  EmailTemplateOption[]
> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, type, subject')
    .order('type')

  if (error) throw error
  return (data || []) as EmailTemplateOption[]
}

export async function getEmailTemplatesWithBodyHandler(): Promise<
  EmailTemplateWithBody[]
> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_templates type resolves to never (Supabase JS v2.95.2 incompatibility)
  const { data, error } = await (supabase as any)
    .from('email_templates')
    .select('id, type, subject, html_body')
    .order('type')

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    subject: row.subject,
    html_body: (row.html_body as string) ?? '',
  }))
}

export async function getSurveysForWorkflowHandler(): Promise<SurveyOption[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase.from('surveys').select('id, title').order('title')

  if (error) throw error
  return (data || []) as SurveyOption[]
}

export async function getAllExecutionsHandler(
  filters?: ExecutionFilters,
  options?: { limit?: number; offset?: number },
): Promise<ExecutionWithWorkflow[]> {
  const supabase = createServerClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  query = query.eq('is_dry_run', false)

  if (filters?.workflowId) query = query.eq('workflow_id', filters.workflowId)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(toExecutionWithWorkflow)
}

export async function getExecutionWithStepsHandler(
  executionId: string,
): Promise<ExecutionWithSteps | null> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: execData, error: execError } = await (supabase as any)
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .eq('id', executionId)
    .maybeSingle()

  if (execError) throw execError
  if (!execData) return null

  const execution = toExecutionWithWorkflow(execData)
  const workflow_snapshot = parseWorkflowSnapshot(execData.workflow_snapshot)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepsData, error: stepsError } = await (supabase as any)
    .from('workflow_step_executions')
    .select('*, workflow_steps(step_type)')
    .eq('execution_id', executionId)
    .order('attempt_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (stepsError) throw stepsError

  const step_executions: StepExecutionWithMeta[] = (stepsData || []).map(
    toStepExecutionWithMeta,
  )

  return {
    ...execution,
    step_executions,
    workflow_snapshot,
  }
}

// ---------------------------------------------------------------------------
// Retry handler
//
// Restarts a failed or cancelled workflow execution. Discriminated-union return
// shape so callers can match on `error` for UX messaging.
//
// WHY explicit tenant check (defense-in-depth):
//   n8n Orchestrator validates tenant_id from the workflow row, not from the
//   caller. Rejecting cross-tenant attempts at the CMS layer is better UX
//   (immediate not_found vs waiting for n8n to error) and adds a second
//   security boundary.
//
// WHY optimistic lock (not status pre-check + separate update):
//   Two concurrent retry requests could both pass a status check and both
//   dispatch to n8n, starting duplicate executions. The single atomic
//   PATCH WHERE status IN ('failed','cancelled') is the canonical gate.
// ---------------------------------------------------------------------------

export async function retryWorkflowExecutionHandler(input: {
  executionId: string
}): Promise<RetryWorkflowResult> {
  const authResult = await requireAuthContextFull()

  if (authResult.isErr()) return { ok: false, error: 'forbidden' }

  const auth = authResult._unsafeUnwrap()
  if (!hasPermission('workflows.execute', auth.permissions)) {
    return { ok: false, error: 'forbidden' }
  }

  const { tenantId } = auth
  const { executionId } = input
  const supabaseService = createServiceClient()

  // 1. Load execution row — scoped to authenticated tenant.
  //    .eq('tenant_id', tenantId): cross-tenant retry returns not_found (same as
  //    "not found") — never reveal existence of another tenant's execution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: execution, error: fetchError } = await (supabaseService as any)
    .from('workflow_executions')
    .select('id, workflow_id, tenant_id, trigger_payload, status')
    .eq('id', executionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError || !execution) return { ok: false, error: 'not_found' }

  // 2. Optimistic lock: atomically transition failed/cancelled → running.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locked, error: lockError } = await (supabaseService as any)
    .from('workflow_executions')
    .update({ status: 'running', error_message: null, completed_at: null })
    .eq('id', executionId)
    .in('status', ['failed', 'cancelled'])
    .select('id')
    .maybeSingle()

  if (lockError || !locked) return { ok: false, error: 'conflict' }

  // 3. Dispatch to n8n Orchestrator.
  const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
  if (!n8nUrl) {
    await reverseOptimisticLock(supabaseService, executionId, 'Orchestrator not configured')
    return { ok: false, error: 'orchestrator_not_configured' }
  }

  const retryPayload: Record<string, unknown> = {
    ...((execution.trigger_payload as Record<string, unknown>) || {}),
    __retry_execution_id__: executionId,
  }

  const dispatchResult = await dispatchToN8nHandler(
    n8nUrl,
    execution.workflow_id,
    tenantId,
    retryPayload,
  )

  if (dispatchResult.isErr()) {
    const dispatchError = dispatchResult.error
    await reverseOptimisticLock(
      supabaseService,
      executionId,
      `Dispatch failed: ${dispatchError}`,
    )
    return { ok: false, error: 'dispatch_failed', message: dispatchError }
  }

  const { executionId: newExecId } = dispatchResult.value
  return { ok: true, executionId: newExecId ?? executionId }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function reverseOptimisticLock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseService: any,
  executionId: string,
  errorMessage: string,
): Promise<void> {
  try {
    await supabaseService
      .from('workflow_executions')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', executionId)
  } catch (e) {
    console.error('[retry] Failed to reverse optimistic lock:', e)
  }
}

/**
 * POST trigger payload to n8n Orchestrator webhook.
 * Returns ResultAsync — success carries executionId from n8n response.
 *
 * Re-exported via server.ts as `dispatchToN8n` for the public trigger route.
 */
export function dispatchToN8nHandler(
  n8nUrl: string,
  workflowId: string,
  tenantId: string,
  triggerPayload: Record<string, unknown>,
) {
  return ResultAsync.fromPromise(
    fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ORCHESTRATOR_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({ workflowId, tenantId, triggerPayload }),
    }).then(async (resp) => {
      if (!resp.ok) throw new Error(`n8n dispatch failed: ${resp.status}`)
      return resp.json() as Promise<{ executionId: string }>
    }),
    (e) => (e instanceof Error ? e.message : messages.common.unknownError),
  )
}

/**
 * Fetch workflow for the public trigger entry point (Bearer secret auth).
 * Verifies workflow exists, is active, and trigger_type matches.
 *
 * WHY service role: the public /api/workflows/trigger route authenticates via
 * Bearer secret, not user cookies, so RLS-aware client wouldn't find the row.
 */
export function fetchWorkflowForPublicTriggerHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createServiceClient> | any,
  workflowId: string,
  triggerType: string,
): ResultAsync<{ tenantId: string }, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type, is_active')
      .eq('id', workflowId)
      .maybeSingle() as Promise<{
      data: {
        id: string
        tenant_id: string
        trigger_type: string
        is_active: boolean
      } | null
      error: { message: string } | null
    }>,
    (e) => (e instanceof Error ? e.message : messages.common.unknownError),
  ).andThen((res) => {
    if (res.error) return err(res.error.message)
    const workflow = res.data
    if (!workflow) return err('workflow_not_found')
    if (!workflow.is_active) return err('workflow_not_active')
    if (workflow.trigger_type !== triggerType) return err('trigger_type_mismatch')
    return ok({ tenantId: workflow.tenant_id })
  })
}
