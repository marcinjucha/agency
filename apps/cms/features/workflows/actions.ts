'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  saveCanvasSchema,
  type CreateWorkflowFormData,
  type UpdateWorkflowFormData,
  type SaveCanvasFormData,
} from './validation'
import { toWorkflow, type Workflow } from './types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Workflow CRUD ---

export async function createWorkflow(
  data: CreateWorkflowFormData
): Promise<{ success: boolean; data?: Workflow; error?: string }> {
  try {
    const parsed = createWorkflowSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

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

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

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
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

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
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

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

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

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
    const triggerTypes = new Set(['survey_submitted', 'booking_created', 'lead_scored', 'manual'])
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
