'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  saveCanvasSchema,
  createWorkflowFromTemplateSchema,
  type CreateWorkflowFormData,
  type UpdateWorkflowFormData,
  type SaveCanvasFormData,
} from './validation'
import { toWorkflow, toWorkflowStep, type Workflow } from './types'
import { executeWorkflow } from './engine/executor'
import { dryRunHandlers } from './engine/action-handlers'
import { createServiceClient } from '@/lib/supabase/service'
import type { ExecutionContext, VariableContext } from './engine/types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { WORKFLOW_TEMPLATES } from './templates/workflow-templates'

// --- Workflow CRUD ---

export async function createWorkflow(
  data: CreateWorkflowFormData
): Promise<{ success: boolean; data?: Workflow; error?: string }> {
  try {
    const parsed = createWorkflowSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    const insertPayload = {
      tenant_id: tenantId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      trigger_type: parsed.data.trigger_type ?? 'manual',
      trigger_config: parsed.data.trigger_config || {},
      is_active: parsed.data.is_active,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
    const { data: created, error } = await (supabase as any)
      .from('workflows')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.workflows)
    return { success: true, data: toWorkflow(created) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowFormData
): Promise<{ success: boolean; data?: Workflow; error?: string }> {
  try {
    const parsed = updateWorkflowSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase } = auth.data

    const updatePayload: Record<string, unknown> = {}

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null
    if (parsed.data.trigger_type !== undefined) updatePayload.trigger_type = parsed.data.trigger_type
    if (parsed.data.trigger_config !== undefined) updatePayload.trigger_config = parsed.data.trigger_config
    if (parsed.data.is_active !== undefined) updatePayload.is_active = parsed.data.is_active

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    const { data: updated, error } = await (supabase as any)
      .from('workflows')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.workflows)
    revalidatePath(routes.admin.workflow(id))
    return { success: true, data: toWorkflow(updated) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function deleteWorkflow(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase } = auth.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    const { error } = await (supabase as any)
      .from('workflows')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.workflows)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function toggleWorkflowActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase } = auth.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    const { error } = await (supabase as any)
      .from('workflows')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.workflows)
    revalidatePath(routes.admin.workflow(id))
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

// --- Canvas bulk save (visual editor) ---

export async function saveWorkflowCanvas(
  workflowId: string,
  data: SaveCanvasFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = saveCanvasSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase } = auth.data

    // 1. Get existing step IDs for this workflow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSteps, error: fetchStepsError } = await (supabase as any)
      .from('workflow_steps')
      .select('id')
      .eq('workflow_id', workflowId)

    if (fetchStepsError) return { success: false, error: fetchStepsError.message }

    const existingStepIds = new Set<string>((existingSteps || []).map((s: { id: string }) => s.id))
    const incomingStepIds = new Set<string>(
      parsed.data.steps.filter((s): s is typeof s & { id: string } => !!s.id).map((s) => s.id)
    )

    // 2. Delete removed steps (cascade will handle edges referencing them)
    const stepsToDelete = [...existingStepIds].filter((id) => !incomingStepIds.has(id))
    if (stepsToDelete.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteStepsError } = await (supabase as any)
        .from('workflow_steps')
        .delete()
        .in('id', stepsToDelete)

      if (deleteStepsError) return { success: false, error: deleteStepsError.message }
    }

    // 3. Upsert steps
    const stepsPayload = parsed.data.steps.map((step) => ({
      ...(step.id ? { id: step.id } : {}),
      workflow_id: workflowId,
      step_type: step.step_type,
      step_config: step.step_config,
      position_x: step.position_x,
      position_y: step.position_y,
    }))

    if (stepsPayload.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upsertStepsError } = await (supabase as any)
        .from('workflow_steps')
        .upsert(stepsPayload, { onConflict: 'id' })

      if (upsertStepsError) return { success: false, error: upsertStepsError.message }
    }

    // 4. Delete all existing edges and re-insert (simpler than diffing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteEdgesError } = await (supabase as any)
      .from('workflow_edges')
      .delete()
      .eq('workflow_id', workflowId)

    if (deleteEdgesError) return { success: false, error: deleteEdgesError.message }

    // 5. Insert new edges
    if (parsed.data.edges.length > 0) {
      const edgesPayload = parsed.data.edges.map((edge) => ({
        workflow_id: workflowId,
        source_step_id: edge.source_step_id,
        target_step_id: edge.target_step_id,
        condition_branch: edge.condition_branch || null,
        sort_order: edge.sort_order,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertEdgesError } = await (supabase as any)
        .from('workflow_edges')
        .insert(edgesPayload)

      if (insertEdgesError) return { success: false, error: insertEdgesError.message }
    }

    // 6. Sync trigger_type from canvas trigger node to workflow row
    const triggerTypes = new Set(['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled'])
    const triggerStep = parsed.data.steps.find((s) => triggerTypes.has(s.step_type))
    if (triggerStep) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workflows')
        .update({ trigger_type: triggerStep.step_type })
        .eq('id', workflowId)
    }

    revalidatePath(routes.admin.workflow(workflowId))
    revalidatePath(routes.admin.workflowEditor(workflowId))
    revalidatePath(routes.admin.workflows)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

// --- Manual trigger & cancel execution ---

export async function triggerManualWorkflow(
  workflowId: string
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Verify workflow belongs to user's tenant and has manual trigger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workflow, error: fetchError } = await (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type')
      .eq('id', workflowId)
      .maybeSingle()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!workflow) return { success: false, error: messages.workflows.workflowNotFound }

    if (workflow.tenant_id !== tenantId) {
      return { success: false, error: messages.workflows.workflowNotFound }
    }

    if (workflow.trigger_type !== 'manual') {
      return { success: false, error: messages.workflows.notManualTrigger }
    }

    const result = await executeWorkflow(workflowId, { trigger_type: 'manual' })

    revalidatePath(routes.admin.workflow(workflowId))
    revalidatePath(routes.admin.workflowExecutions(workflowId))
    return { success: true, executionId: result.executionId }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

// --- Template-based workflow creation ---

export async function createWorkflowFromTemplate(
  templateId: string
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const parsed = createWorkflowFromTemplateSchema.safeParse({ templateId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const template = WORKFLOW_TEMPLATES.find((t) => t.id === parsed.data.templateId)
    if (!template) {
      return { success: false, error: messages.workflows.templateNotFound }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // 1. Insert workflow row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    const { data: created, error: workflowError } = await (supabase as any)
      .from('workflows')
      .insert({
        tenant_id: tenantId,
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        is_active: false,
      })
      .select('id')
      .single()

    if (workflowError) return { success: false, error: workflowError.message }

    const workflowId = created.id as string

    // 2. Build UUID remapping: stable tempId → new UUID
    const idMap = new Map<string, string>()
    for (const step of template.steps) {
      idMap.set(step.tempId, crypto.randomUUID())
    }

    // 3. Insert workflow_steps with fresh UUIDs
    if (template.steps.length > 0) {
      const stepsPayload = template.steps.map((step) => ({
        id: idMap.get(step.tempId)!,
        workflow_id: workflowId,
        step_type: step.step_type,
        step_config: step.step_config,
        position_x: step.position_x,
        position_y: step.position_y,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: stepsError } = await (supabase as any)
        .from('workflow_steps')
        .insert(stepsPayload)

      if (stepsError) return { success: false, error: stepsError.message }
    }

    // 4. Insert workflow_edges with remapped source/target IDs
    if (template.edges.length > 0) {
      const edgesPayload = template.edges.map((edge, index) => ({
        workflow_id: workflowId,
        source_step_id: idMap.get(edge.source_temp_id)!,
        target_step_id: idMap.get(edge.target_temp_id)!,
        condition_branch: edge.condition_branch ?? null,
        sort_order: edge.sort_order ?? index,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: edgesError } = await (supabase as any)
        .from('workflow_edges')
        .insert(edgesPayload)

      if (edgesError) return { success: false, error: edgesError.message }
    }

    revalidatePath(routes.admin.workflows)
    return { success: true, data: { id: workflowId } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

const MAX_PAYLOAD_SIZE = 100_000 // 100KB

export async function dryRunWorkflow(
  workflowId: string,
  mockTriggerPayload: Record<string, unknown>
): Promise<{ success: boolean; data?: { executionId: string; status: string }; error?: string }> {
  try {
    if (JSON.stringify(mockTriggerPayload).length > MAX_PAYLOAD_SIZE) {
      return { success: false, error: 'Payload too large' }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Verify workflow belongs to user's tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workflow, error: fetchError } = await (supabase as any)
      .from('workflows')
      .select('id, tenant_id')
      .eq('id', workflowId)
      .maybeSingle()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!workflow) return { success: false, error: messages.workflows.workflowNotFound }

    if (workflow.tenant_id !== tenantId) {
      return { success: false, error: messages.workflows.workflowNotFound }
    }

    const triggerPayload = {
      trigger_type: 'manual' as const,
      ...mockTriggerPayload,
    }

    const result = await executeWorkflow(workflowId, triggerPayload, { dryRun: true })

    revalidatePath(routes.admin.workflow(workflowId))
    return { success: true, data: { executionId: result.executionId, status: result.status } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function dryRunSingleStep(
  workflowId: string,
  stepId: string,
  inputPayload: Record<string, unknown>
): Promise<{ success: boolean; data?: { status: string; outputPayload: Record<string, unknown> | null; errorMessage?: string }; error?: string }> {
  try {
    if (JSON.stringify(inputPayload).length > MAX_PAYLOAD_SIZE) {
      return { success: false, error: 'Payload too large' }
    }

    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Fetch step and verify ownership via workflow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: step, error: stepError } = await (supabase as any)
      .from('workflow_steps')
      .select('*, workflows(tenant_id)')
      .eq('id', stepId)
      .eq('workflow_id', workflowId)
      .maybeSingle()

    if (stepError) return { success: false, error: stepError.message }
    if (!step) return { success: false, error: messages.workflows.workflowNotFound }

    if (step.workflows?.tenant_id !== tenantId) {
      return { success: false, error: messages.workflows.workflowNotFound }
    }

    const stepType = step.step_type as string
    const handler = dryRunHandlers[stepType]
    if (!handler) {
      return { success: false, error: `No dry-run handler for step type: ${stepType}` }
    }

    const workflowStep = toWorkflowStep(step)
    const serviceClient = createServiceClient()

    const minimalContext: ExecutionContext = {
      executionId: 'dry-run-single',
      workflowId,
      tenantId,
      triggerPayload: { trigger_type: 'manual' },
      stepExecutionId: 'dry-run-single-step',
    }

    const variableContext: VariableContext = { ...inputPayload }

    const result = await handler(workflowStep, minimalContext, serviceClient, variableContext)

    return {
      success: true,
      data: {
        status: result.success ? 'completed' : 'failed',
        outputPayload: result.outputPayload ?? null,
        errorMessage: result.error,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function cancelWorkflowExecution(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth('workflows')
    if (!auth.success) return auth
    const { tenantId } = auth.data

    const serviceClient = createServiceClient()

    // Fetch execution and verify tenant ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: execution, error: fetchError } = await (serviceClient as any)
      .from('workflow_executions')
      .select('id, workflow_id, tenant_id, status')
      .eq('id', executionId)
      .maybeSingle()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!execution) return { success: false, error: messages.workflows.executionNotFound }

    if (execution.tenant_id !== tenantId) {
      return { success: false, error: messages.workflows.executionNotFound }
    }

    // Only cancel running or pending executions
    if (!['running', 'pending'].includes(execution.status)) {
      return { success: false, error: messages.workflows.cancelOnlyRunning }
    }

    const now = new Date().toISOString()

    // Update execution status to cancelled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (serviceClient as any)
      .from('workflow_executions')
      .update({ status: 'cancelled', completed_at: now })
      .eq('id', executionId)

    if (updateError) return { success: false, error: updateError.message }

    // Cancel all pending and running step executions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: stepsError } = await (serviceClient as any)
      .from('workflow_step_executions')
      .update({ status: 'cancelled', completed_at: now })
      .eq('execution_id', executionId)
      .in('status', ['pending', 'running'])

    if (stepsError) {
      console.error('[cancelWorkflowExecution] Failed to cancel step executions:', stepsError.message)
    }

    const workflowId = execution.workflow_id as string
    revalidatePath(routes.admin.workflow(workflowId))
    revalidatePath(routes.admin.workflowExecutions(workflowId))
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
