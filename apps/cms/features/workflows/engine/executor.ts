import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'
import type { WorkflowStep, WorkflowEdge } from '../types'
import { toWorkflow, toWorkflowStep, toWorkflowEdge } from '../types'
import type {
  TriggerPayload,
  StepHandlerRegistry,
  ExecutionContext,
  VariableContext,
} from './types'
import { createServiceClient } from '@/lib/supabase/service'
import { topologicalSort, buildTriggerContext } from './utils'
import { evaluateCondition } from './condition-evaluator'
import { findMatchingWorkflows } from './trigger-matcher'
import { stepHandlers as handlers } from './action-handlers'

// --- DB helper types ---

type StepExecutionRecord = {
  id: string
  step_id: string
}

/** Resolves a step execution ID from the lookup map (supports both map shapes) */
function resolveStepExecId(
  lookup: string | StepExecRow | undefined
): string | undefined {
  if (!lookup) return undefined
  return typeof lookup === 'string' ? lookup : lookup.id
}

// --- Core executor ---

/**
 * Executes a single workflow from trigger to completion.
 *
 * Flow:
 *   1. Fetch workflow + steps + edges
 *   2. Circular protection (depth > 0 rejected)
 *   3. Create workflow_execution record (status='running')
 *   4. Create workflow_step_execution records (status='pending')
 *   5. topologicalSort steps
 *   6. Execute steps sequentially with condition branching
 *   7. Mark execution completed or failed
 *
 * All DB writes use service client (bypasses RLS).
 */
export async function executeWorkflow(
  workflowId: string,
  triggerPayload: TriggerPayload,
  options?: { triggeringExecutionId?: string }
): Promise<{ executionId: string; status: 'completed' | 'failed' | 'waiting_for_callback' }> {
  const serviceClient = createServiceClient()

  let executionId: string | undefined

  try {
    // --- 1. Fetch workflow + steps + edges ---
    const workflow = await fetchWorkflow(serviceClient, workflowId)

    if (!workflow.is_active) {
      return { executionId: '', status: 'failed' }
    }

    const steps = await fetchSteps(serviceClient, workflowId)
    const edges = await fetchEdges(serviceClient, workflowId)

    // --- 2. Circular protection (max depth = 1) ---
    // Depth 0: direct trigger (no triggeringExecutionId) → always allowed
    // Depth 1: triggered by another workflow → allowed if parent has no parent
    // Depth 2+: parent itself was triggered → reject
    if (options?.triggeringExecutionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentExec, error: parentError } = await (serviceClient as any)
        .from('workflow_executions')
        .select('triggering_execution_id')
        .eq('id', options.triggeringExecutionId)
        .maybeSingle()

      if (parentError) {
        throw new Error(`Failed to check parent execution: ${parentError.message}`)
      }

      if (parentExec?.triggering_execution_id) {
        throw new Error(
          `Circular workflow protection: workflow ${workflowId} was triggered by execution ${options.triggeringExecutionId} which itself was triggered by ${parentExec.triggering_execution_id}. Chaining depth > 1 is not allowed.`
        )
      }
    }

    // --- 3. Create execution record ---
    executionId = await createExecution(serviceClient, {
      workflow_id: workflowId,
      tenant_id: workflow.tenant_id,
      trigger_payload: triggerPayload as unknown as Record<string, unknown>,
      triggering_execution_id: options?.triggeringExecutionId ?? null,
      status: 'running',
      started_at: new Date().toISOString(),
    })

    // --- 4. Handle empty workflow ---
    if (steps.length === 0) {
      await updateExecutionStatus(serviceClient, executionId, 'completed')
      return { executionId, status: 'completed' }
    }

    // --- 5. Create step execution records ---
    const stepExecutionMap = await createStepExecutions(
      serviceClient,
      executionId,
      steps
    )

    // --- 6. Topological sort ---
    const sortedSteps = topologicalSort(steps, edges)

    // --- 7. Execute steps sequentially ---
    const variableContext: VariableContext = buildTriggerContext(
      workflow.trigger_type as string,
      triggerPayload
    )

    const skippedStepIds = new Set<string>()

    const loopStatus = await runPendingSteps(
      sortedSteps,
      stepExecutionMap,
      skippedStepIds,
      {
        executionId,
        workflowId,
        tenantId: workflow.tenant_id,
        triggerPayload,
        triggeringExecutionId: options?.triggeringExecutionId,
      },
      variableContext,
      edges,
      steps,
      serviceClient
    )

    // --- 8. Final status ---
    if (loopStatus === 'waiting_for_callback') {
      return { executionId, status: 'waiting_for_callback' }
    }

    if (loopStatus === 'failed') {
      return { executionId, status: 'failed' }
    }

    await updateExecutionStatus(serviceClient, executionId, 'completed')
    return { executionId, status: 'completed' }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown execution error'

    console.error(`[executor] Workflow ${workflowId} failed:`, errorMessage)

    if (executionId) {
      await updateExecutionStatus(
        serviceClient,
        executionId,
        'failed',
        errorMessage
      ).catch((updateErr) => {
        console.error(
          '[executor] Failed to update execution status:',
          updateErr
        )
      })
    }

    return {
      executionId: executionId ?? 'unknown',
      status: 'failed',
    }
  }
}

/**
 * Convenience function: finds all active workflows matching a trigger
 * and executes them sequentially.
 *
 * Returns results for each workflow execution.
 */
export async function processWorkflowTrigger(
  triggerType: string,
  tenantId: string,
  triggerPayload: TriggerPayload,
  options?: { triggeringExecutionId?: string }
): Promise<{ executionId: string; status: 'completed' | 'failed' | 'waiting_for_callback' }[]> {
  const serviceClient = createServiceClient()

  const matchingWorkflows = await findMatchingWorkflows(
    triggerType,
    tenantId,
    serviceClient
  )

  if (matchingWorkflows.length === 0) {
    return []
  }

  const results: { executionId: string; status: 'completed' | 'failed' | 'waiting_for_callback' }[] = []

  for (const workflow of matchingWorkflows) {
    const result = await executeWorkflow(
      workflow.id,
      triggerPayload,
      options
    )
    results.push(result)
  }

  return results
}

/**
 * Resumes execution after an async step (e.g. webhook callback) completes.
 *
 * Flow:
 *   1. Fetch execution record + workflow steps + edges + all step_executions
 *   2. If the completed step failed -> mark remaining pending steps as skipped, execution as failed
 *   3. If completed -> find the next pending step in topological order and continue sequential execution
 *   4. If no more pending steps -> mark execution as completed
 *
 * Called by the /api/workflows/callback route after updating the step_execution record.
 */
export async function resumeExecution(
  executionId: string,
  completedStepExecId: string,
  completedStatus: 'completed' | 'failed'
): Promise<void> {
  const serviceClient = createServiceClient()

  try {
    // --- 1. Fetch execution ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: execution, error: execError } = await (serviceClient as any)
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .maybeSingle()

    if (execError) throw new Error(`Failed to fetch execution: ${execError.message}`)
    if (!execution) throw new Error(`Execution ${executionId} not found`)

    // If execution is already completed/failed/cancelled, don't resume
    if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
      return
    }

    // Optimistic lock: atomically claim this execution for processing.
    // If another process already took over, affected rows = 0 → return early.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lockResult, error: lockError } = await (serviceClient as any)
      .from('workflow_executions')
      .update({ status: 'running' })
      .eq('id', executionId)
      .in('status', ['running', 'waiting_for_callback'])
      .select('id')

    if (lockError) throw new Error(`Failed to acquire execution lock: ${lockError.message}`)
    if (!lockResult || lockResult.length === 0) {
      // Another process already took over — exit silently
      return
    }

    const workflowId = execution.workflow_id as string

    // --- 2. Fetch steps, edges, step_executions ---
    const steps = await fetchSteps(serviceClient, workflowId)
    const edges = await fetchEdges(serviceClient, workflowId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stepExecs, error: stepExecError } = await (serviceClient as any)
      .from('workflow_step_executions')
      .select('*')
      .eq('execution_id', executionId)

    if (stepExecError) throw new Error(`Failed to fetch step executions: ${stepExecError.message}`)

    // Build step_id -> step_execution mapping
    const stepExecByStepId = new Map<string, StepExecRow>()
    for (const se of (stepExecs || []) as StepExecRow[]) {
      stepExecByStepId.set(se.step_id, se)
    }

    // Find the step_id of the just-completed step
    const completedStepExec = (stepExecs || []).find(
      (se: { id: string }) => se.id === completedStepExecId
    ) as StepExecRow | undefined
    if (!completedStepExec) throw new Error(`Step execution ${completedStepExecId} not found`)

    // --- 3. If failed -> mark remaining as skipped, execution as failed ---
    const sortedSteps = topologicalSort(steps, edges)

    if (completedStatus === 'failed') {
      await skipAllPendingSteps(serviceClient, sortedSteps, stepExecByStepId)

      await updateExecutionStatus(
        serviceClient,
        executionId,
        'failed',
        `Step ${completedStepExec.step_id} failed (reported via callback)`
      )
      return
    }

    // --- 4. If completed -> continue from next pending step ---

    // Rebuild variable context from trigger + all completed step outputs
    const triggerPayload = (execution.trigger_payload && typeof execution.trigger_payload === 'object'
      ? execution.trigger_payload
      : {}) as TriggerPayload

    const workflow = await fetchWorkflow(serviceClient, workflowId)
    const variableContext: VariableContext = buildTriggerContext(
      workflow.trigger_type as string,
      triggerPayload
    )

    // Merge output_payload from all completed steps into variable context.
    // Uses already-fetched stepExecs data (SELECT * above) — no extra queries needed.
    for (const step of sortedSteps) {
      const se = stepExecByStepId.get(step.id)
      if (!se || se.status !== 'completed') continue

      if (se.output_payload && typeof se.output_payload === 'object') {
        Object.assign(variableContext, se.output_payload)
      }
    }

    // Track steps already skipped (from condition branches).
    // First: collect steps already marked skipped in DB.
    // Then: replay condition branch propagation for completed condition steps
    // to cover any downstream pending steps not yet marked skipped.
    const skippedStepIds = new Set<string>()
    for (const step of sortedSteps) {
      const se = stepExecByStepId.get(step.id)
      if (se && se.status === 'skipped') {
        skippedStepIds.add(step.id)
      }
    }

    // Replay condition branch propagation for completed condition steps
    for (const step of sortedSteps) {
      const se = stepExecByStepId.get(step.id)
      if (!se || se.status !== 'completed') continue
      if (step.step_config.type !== 'condition') continue

      const branch = se.output_payload?.branch as string | undefined
      if (branch === 'true' || branch === 'false') {
        markSkippedBranch(step.id, branch, edges, steps, skippedStepIds)
      }
    }

    // Execute remaining pending steps using shared loop
    const loopStatus = await runPendingSteps(
      sortedSteps,
      stepExecByStepId,
      skippedStepIds,
      {
        executionId,
        workflowId,
        tenantId: workflow.tenant_id,
        triggerPayload,
        triggeringExecutionId: (execution.triggering_execution_id as string) ?? undefined,
      },
      variableContext,
      edges,
      steps,
      serviceClient
    )

    // --- 5. Final status ---
    if (loopStatus === 'waiting_for_callback' || loopStatus === 'failed') {
      return
    }

    await updateExecutionStatus(serviceClient, executionId, 'completed')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown resume error'
    console.error(`[executor] Resume failed for execution ${executionId}:`, errorMessage)

    await updateExecutionStatus(serviceClient, executionId, 'failed', errorMessage).catch(
      (updateErr) => {
        console.error('[executor] Failed to update execution status during resume:', updateErr)
      }
    )
  }
}

// --- Shared step execution loop ---

type StepExecRow = { id: string; step_id: string; status: string; output_payload?: Record<string, unknown> | null }

/**
 * Shared step execution loop used by both `executeWorkflow` and `resumeExecution`.
 *
 * Iterates sorted steps, skipping non-pending and condition-branched steps.
 * Handles condition evaluation, handler dispatch, async steps, and failure propagation.
 *
 * `stepExecLookup` is a Map<stepId, stepExecId | StepExecRow> — accepts either
 * a Map<string, string> (from executeWorkflow) or Map<string, StepExecRow> (from resumeExecution).
 */
async function runPendingSteps(
  sortedSteps: WorkflowStep[],
  stepExecLookup: Map<string, string> | Map<string, StepExecRow>,
  skippedStepIds: Set<string>,
  contextBase: {
    executionId: string
    workflowId: string
    tenantId: string
    triggerPayload: TriggerPayload
    triggeringExecutionId?: string
  },
  variableContext: VariableContext,
  edges: WorkflowEdge[],
  steps: WorkflowStep[],
  serviceClient: SupabaseClient<Database>
): Promise<'completed' | 'failed' | 'waiting_for_callback'> {
  for (const step of sortedSteps) {
    const lookup = stepExecLookup.get(step.id)
    if (!lookup) continue

    // Resolve step execution ID: supports both Map<string,string> and Map<string,StepExecRow>
    const stepExecId = typeof lookup === 'string' ? lookup : lookup.id
    const stepExecStatus = typeof lookup === 'string' ? null : lookup.status

    // Skip already non-pending steps (resumeExecution provides status)
    if (stepExecStatus && stepExecStatus !== 'pending') continue

    // Skip if this step was excluded by a condition branch
    if (skippedStepIds.has(step.id)) {
      await updateStepExecutionStatus(serviceClient, stepExecId, 'skipped')
      continue
    }

    const context: ExecutionContext = {
      executionId: contextBase.executionId,
      workflowId: contextBase.workflowId,
      tenantId: contextBase.tenantId,
      triggerPayload: contextBase.triggerPayload,
      stepExecutionId: stepExecId,
      triggeringExecutionId: contextBase.triggeringExecutionId,
    }

    // Mark step as running
    await updateStepExecution(serviceClient, stepExecId, {
      status: 'running',
      started_at: new Date().toISOString(),
      input_payload: variableContext as unknown as Record<string, unknown>,
    })

    // --- Condition step ---
    if (step.step_config.type === 'condition') {
      const branch = evaluateCondition(step.step_config.expression, variableContext)

      await updateStepExecution(serviceClient, stepExecId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_payload: { branch },
      })

      markSkippedBranch(step.id, branch, edges, steps, skippedStepIds)
      continue
    }

    // --- Regular step ---
    const handler = handlers[step.step_type]
    if (!handler) {
      console.warn(
        `[executor] No handler registered for step type "${step.step_type}". Skipping step ${step.id}.`
      )
      await updateStepExecution(serviceClient, stepExecId, {
        status: 'skipped',
        completed_at: new Date().toISOString(),
        output_payload: { warning: `No handler for step type "${step.step_type}"` },
      })
      continue
    }

    const result = await handler(step, context, serviceClient, variableContext)

    if (result.success) {
      if (result.outputPayload) {
        Object.assign(variableContext, result.outputPayload)
      }

      // Async steps (n8n-dispatched): leave in 'running' — callback will complete them.
      if (result.async) {
        return 'waiting_for_callback'
      }

      await updateStepExecution(serviceClient, stepExecId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_payload: result.outputPayload ?? null,
      })
    } else {
      // Step failed — mark remaining as skipped, execution as failed
      await updateStepExecution(serviceClient, stepExecId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: result.error ?? 'Unknown step error',
      })

      await skipRemainingSteps(
        serviceClient,
        sortedSteps,
        step.id,
        stepExecLookup,
        skippedStepIds
      )

      await updateExecutionStatus(
        serviceClient,
        contextBase.executionId,
        'failed',
        result.error
      )

      return 'failed'
    }
  }

  return 'completed'
}

/**
 * Marks all pending steps as skipped. Used by resumeExecution when the
 * async step that just completed reported failure.
 */
async function skipAllPendingSteps(
  client: SupabaseClient<Database>,
  sortedSteps: WorkflowStep[],
  stepExecByStepId: Map<string, StepExecRow>
): Promise<void> {
  for (const step of sortedSteps) {
    const se = stepExecByStepId.get(step.id)
    if (se && se.status === 'pending') {
      await updateStepExecutionStatus(client, se.id, 'skipped')
    }
  }
}

// --- Condition branching logic ---

/**
 * After a condition step evaluates to a branch ('true' or 'false'),
 * marks steps reachable ONLY via the opposite branch as skipped.
 *
 * A step is skipped if ALL its incoming edges from this condition
 * are on the non-chosen branch. Steps reachable via other paths
 * (non-condition edges) are NOT skipped.
 */
function markSkippedBranch(
  conditionStepId: string,
  chosenBranch: 'true' | 'false',
  edges: WorkflowEdge[],
  steps: WorkflowStep[],
  skippedStepIds: Set<string>
): void {
  const outgoingEdges = edges.filter((e) => e.source_step_id === conditionStepId)

  // Edges on the non-chosen branch
  const nonChosenBranch = chosenBranch === 'true' ? 'false' : 'true'
  const skippedEdges = outgoingEdges.filter(
    (e) => e.condition_branch === nonChosenBranch
  )

  // Steps targeted by non-chosen branch
  const candidateSkipIds = new Set(skippedEdges.map((e) => e.target_step_id))

  // Only skip if the step has no OTHER incoming edges that could still reach it
  for (const candidateId of candidateSkipIds) {
    const allIncomingEdges = edges.filter((e) => e.target_step_id === candidateId)
    const hasAlternatePath = allIncomingEdges.some(
      (e) =>
        e.source_step_id !== conditionStepId ||
        e.condition_branch === chosenBranch ||
        e.condition_branch === null
    )

    if (!hasAlternatePath) {
      skippedStepIds.add(candidateId)
      // Recursively skip downstream steps only reachable from this skipped step
      markDownstreamSkipped(candidateId, edges, skippedStepIds)
    }
  }
}

/**
 * Recursively marks all downstream steps as skipped when their only
 * incoming path is through an already-skipped step.
 */
function markDownstreamSkipped(
  stepId: string,
  edges: WorkflowEdge[],
  skippedStepIds: Set<string>
): void {
  const outgoing = edges.filter((e) => e.source_step_id === stepId)

  for (const edge of outgoing) {
    if (skippedStepIds.has(edge.target_step_id)) continue

    const allIncoming = edges.filter((e) => e.target_step_id === edge.target_step_id)
    const allIncomingSkipped = allIncoming.every((e) =>
      skippedStepIds.has(e.source_step_id)
    )

    if (allIncomingSkipped) {
      skippedStepIds.add(edge.target_step_id)
      markDownstreamSkipped(edge.target_step_id, edges, skippedStepIds)
    }
  }
}

// --- DB operations (service client, bypass RLS) ---

async function fetchWorkflow(
  client: SupabaseClient<Database>,
  workflowId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch workflow: ${error.message}`)
  if (!data) throw new Error(`Workflow ${workflowId} not found`)

  return toWorkflow(data)
}

async function fetchSteps(
  client: SupabaseClient<Database>,
  workflowId: string
): Promise<WorkflowStep[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch steps: ${error.message}`)
  return (data || []).map(toWorkflowStep)
}

async function fetchEdges(
  client: SupabaseClient<Database>,
  workflowId: string
): Promise<WorkflowEdge[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('workflow_edges')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch edges: ${error.message}`)
  return (data || []).map(toWorkflowEdge)
}

async function createExecution(
  client: SupabaseClient<Database>,
  record: {
    workflow_id: string
    tenant_id: string
    trigger_payload: Record<string, unknown>
    triggering_execution_id: string | null
    status: string
    started_at: string
  }
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('workflow_executions')
    .insert(record)
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create execution: ${error.message}`)
  return data.id
}

async function createStepExecutions(
  client: SupabaseClient<Database>,
  executionId: string,
  steps: WorkflowStep[]
): Promise<Map<string, string>> {
  const records = steps.map((step) => ({
    execution_id: executionId,
    step_id: step.id,
    status: 'pending',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('workflow_step_executions')
    .insert(records)
    .select('id, step_id')

  if (error)
    throw new Error(`Failed to create step executions: ${error.message}`)

  const map = new Map<string, string>()
  for (const row of (data as StepExecutionRecord[]) || []) {
    map.set(row.step_id, row.id)
  }
  return map
}

async function updateExecutionStatus(
  client: SupabaseClient<Database>,
  executionId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  }
  if (errorMessage) {
    update.error_message = errorMessage
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('workflow_executions')
    .update(update)
    .eq('id', executionId)

  if (error)
    throw new Error(`Failed to update execution ${executionId} status to ${status}: ${error.message}`)
}

async function updateStepExecution(
  client: SupabaseClient<Database>,
  stepExecId: string,
  update: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('workflow_step_executions')
    .update(update)
    .eq('id', stepExecId)

  if (error)
    throw new Error(`Failed to update step execution ${stepExecId}: ${error.message}`)
}

async function updateStepExecutionStatus(
  client: SupabaseClient<Database>,
  stepExecId: string,
  status: string
): Promise<void> {
  await updateStepExecution(client, stepExecId, {
    status,
    completed_at: new Date().toISOString(),
  })
}

async function skipRemainingSteps(
  client: SupabaseClient<Database>,
  sortedSteps: WorkflowStep[],
  failedStepId: string,
  stepExecLookup: Map<string, string> | Map<string, StepExecRow>,
  alreadySkipped: Set<string>
): Promise<void> {
  let pastFailed = false

  for (const step of sortedSteps) {
    if (step.id === failedStepId) {
      pastFailed = true
      continue
    }
    if (!pastFailed) continue
    if (alreadySkipped.has(step.id)) continue

    const stepExecId = resolveStepExecId(stepExecLookup.get(step.id))
    if (stepExecId) {
      await updateStepExecutionStatus(client, stepExecId, 'skipped')
    }
  }
}
