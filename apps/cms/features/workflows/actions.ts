'use server'

import { revalidatePath } from 'next/cache'
import { ok, err, errAsync, ResultAsync } from 'neverthrow'
import { requireAuthResult, zodParse, fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import type { AuthSuccess } from '@/lib/auth'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  saveCanvasSchema,
  createWorkflowFromTemplateSchema,
  type CreateWorkflowFormData,
  type UpdateWorkflowFormData,
  type SaveCanvasFormData,
} from './validation'
import { toWorkflow } from './types'
import { createServiceClient } from '@/lib/supabase/service'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { WORKFLOW_TEMPLATES } from './templates/workflow-templates'

// --- DB helpers ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

// --- Workflow CRUD ---

export async function createWorkflow(data: CreateWorkflowFormData) {
  const result = await zodParse(createWorkflowSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('workflows').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      const payload = {
        tenant_id: auth.tenantId,
        name: parsed.name,
        description: parsed.description || null,
        trigger_type: parsed.trigger_type ?? 'manual',
        trigger_config: parsed.trigger_config || {},
        is_active: parsed.is_active,
      }

      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
        (auth.supabase as any)
          .from('workflows')
          .insert(payload)
          .select()
          .single(),
        dbError,
      )
        .andThen(fromSupabase<Record<string, unknown>>())
        .map(toWorkflow)
    })

  return result.match(
    (created) => {
      revalidatePath(routes.admin.workflows)
      return { success: true as const, data: created }
    },
    (error) => ({ success: false as const, error }),
  )
}

export async function updateWorkflow(id: string, data: UpdateWorkflowFormData) {
  const result = await zodParse(updateWorkflowSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('workflows').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      const updatePayload: Record<string, unknown> = {}
      if (parsed.name !== undefined) updatePayload.name = parsed.name
      if (parsed.description !== undefined) updatePayload.description = parsed.description || null
      if (parsed.trigger_type !== undefined) updatePayload.trigger_type = parsed.trigger_type
      if (parsed.trigger_config !== undefined) updatePayload.trigger_config = parsed.trigger_config
      if (parsed.is_active !== undefined) updatePayload.is_active = parsed.is_active

      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
        (auth.supabase as any)
          .from('workflows')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single(),
        dbError,
      )
        .andThen(fromSupabase<Record<string, unknown>>())
        .map(toWorkflow)
    })

  return result.match(
    (updated) => {
      revalidatePath(routes.admin.workflows)
      revalidatePath(routes.admin.workflow(id))
      return { success: true as const, data: updated }
    },
    (error) => ({ success: false as const, error }),
  )
}

export async function deleteWorkflow(id: string) {
  const result = await requireAuthResult('workflows')
    .andThen(({ supabase }) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
        (supabase as any)
          .from('workflows')
          .delete()
          .eq('id', id),
        dbError,
      ).andThen(fromSupabaseVoid()),
    )

  return result.match(
    () => {
      revalidatePath(routes.admin.workflows)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

export async function toggleWorkflowActive(id: string, isActive: boolean) {
  const result = await requireAuthResult('workflows')
    .andThen(({ supabase }) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
        (supabase as any)
          .from('workflows')
          .update({ is_active: isActive })
          .eq('id', id),
        dbError,
      ).andThen(fromSupabaseVoid()),
    )

  return result.match(
    () => {
      revalidatePath(routes.admin.workflows)
      revalidatePath(routes.admin.workflow(id))
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- Canvas bulk save (visual editor) ---

export async function saveWorkflowCanvas(workflowId: string, data: SaveCanvasFormData) {
  const result = await zodParse(saveCanvasSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('workflows').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      const { supabase } = auth

      // Step 1: Fetch existing step IDs
      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('workflow_steps')
          .select('id')
          .eq('workflow_id', workflowId),
        dbError,
      )
        .andThen(fromSupabase<{ id: string }[]>())
        .andThen((existingSteps) => {
          const existingStepIds = new Set<string>(existingSteps.map((s) => s.id))
          const incomingStepIds = new Set<string>(
            parsed.steps.filter((s): s is typeof s & { id: string } => !!s.id).map((s) => s.id),
          )

          // Step 2: Delete removed steps
          const stepsToDelete = [...existingStepIds].filter((id) => !incomingStepIds.has(id))
          const deleteStepsOp =
            stepsToDelete.length > 0
              ? ResultAsync.fromPromise(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (supabase as any).from('workflow_steps').delete().in('id', stepsToDelete),
                  dbError,
                ).andThen(fromSupabaseVoid())
              : ResultAsync.fromSafePromise(Promise.resolve(undefined))

          return deleteStepsOp
            .andThen(() => {
              // Step 3: Upsert steps
              const stepsPayload = parsed.steps.map((step) => ({
                ...(step.id ? { id: step.id } : {}),
                workflow_id: workflowId,
                step_type: step.step_type,
                step_config: step.step_config,
                position_x: step.position_x,
                position_y: step.position_y,
              }))

              if (stepsPayload.length === 0) {
                return ResultAsync.fromSafePromise(Promise.resolve(undefined))
              }

              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any).from('workflow_steps').upsert(stepsPayload, { onConflict: 'id' }),
                dbError,
              ).andThen(fromSupabaseVoid())
            })
            .andThen(() => {
              // Step 4: Delete all existing edges
              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any).from('workflow_edges').delete().eq('workflow_id', workflowId),
                dbError,
              ).andThen(fromSupabaseVoid())
            })
            .andThen(() => {
              // Step 5: Insert new edges
              if (parsed.edges.length === 0) {
                return ResultAsync.fromSafePromise(Promise.resolve(undefined))
              }

              const edgesPayload = parsed.edges.map((edge) => ({
                workflow_id: workflowId,
                source_step_id: edge.source_step_id,
                target_step_id: edge.target_step_id,
                condition_branch: edge.condition_branch || null,
                sort_order: edge.sort_order,
              }))

              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any).from('workflow_edges').insert(edgesPayload),
                dbError,
              ).andThen(fromSupabaseVoid())
            })
            .andThen(() => {
              // Step 6: Sync trigger_type from canvas trigger node to workflow row
              const triggerTypes = new Set([
                'survey_submitted',
                'booking_created',
                'lead_scored',
                'manual',
                'scheduled',
              ])
              const triggerStep = parsed.steps.find((s) => triggerTypes.has(s.step_type))
              if (!triggerStep) {
                return ResultAsync.fromSafePromise(Promise.resolve(undefined))
              }

              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any)
                  .from('workflows')
                  .update({ trigger_type: triggerStep.step_type })
                  .eq('id', workflowId),
                dbError,
              ).andThen(fromSupabaseVoid())
            })
        })
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.workflow(workflowId))
      revalidatePath(routes.admin.workflowEditor(workflowId))
      revalidatePath(routes.admin.workflows)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- Manual trigger & cancel execution ---

export async function triggerManualWorkflow(
  workflowId: string
): Promise<{ success: true; executionId: string } | { success: false; error: string }> {
  const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
  if (!n8nUrl) {
    return { success: false, error: 'N8N_WORKFLOW_ORCHESTRATOR_URL not configured' }
  }

  const result = await requireAuthResult('workflows')
    .andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('workflows')
          .select('id, tenant_id, trigger_type')
          .eq('id', workflowId)
          .maybeSingle(),
        () => messages.common.unknownError,
      )
        .andThen(fromSupabase<{ id: string; tenant_id: string; trigger_type: string }>())
        .andThen((workflow) => {
          if (workflow.tenant_id !== tenantId) return err(messages.workflows.workflowNotFound)
          if (workflow.trigger_type !== 'manual') return err(messages.workflows.notManualTrigger)
          return ok({ tenantId })
        }),
    )
    .andThen(({ tenantId }) =>
      ResultAsync.fromPromise(
        fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ORCHESTRATOR_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({ workflowId, tenantId, triggerPayload: { trigger_type: 'manual' } }),
        }).then(async (resp) => {
          if (!resp.ok) throw new Error(`n8n dispatch failed: ${resp.status}`)
          return resp.json() as Promise<{ executionId: string }>
        }),
        (e) => (e instanceof Error ? e.message : messages.common.unknownError),
      ),
    )

  return result.match(
    ({ executionId }) => {
      revalidatePath(routes.admin.workflow(workflowId))
      revalidatePath(routes.admin.workflowExecutions(workflowId))
      return { success: true as const, executionId }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- Test workflow (dispatch to n8n with custom payload) ---

export async function testWorkflow(
  workflowId: string,
  triggerPayload: Record<string, unknown>,
): Promise<{ success: true; executionId: string } | { success: false; error: string }> {
  const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
  if (!n8nUrl) {
    return { success: false, error: 'N8N_WORKFLOW_ORCHESTRATOR_URL not configured' }
  }

  const result = await requireAuthResult('workflows')
    .andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('workflows')
          .select('id, tenant_id, trigger_type')
          .eq('id', workflowId)
          .maybeSingle(),
        dbError,
      )
        .andThen(fromSupabase<{ id: string; tenant_id: string; trigger_type: string }>())
        .andThen((workflow) => {
          if (workflow.tenant_id !== tenantId) return err(messages.workflows.workflowNotFound)
          return ok({ tenantId, triggerType: workflow.trigger_type })
        }),
    )
    .andThen(({ tenantId, triggerType }) =>
      ResultAsync.fromPromise(
        fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ORCHESTRATOR_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            workflowId,
            tenantId,
            triggerPayload: { trigger_type: triggerType, ...triggerPayload },
          }),
        }).then(async (resp) => {
          if (!resp.ok) throw new Error(`n8n dispatch failed: ${resp.status}`)
          return resp.json() as Promise<{ executionId: string }>
        }),
        (e) => (e instanceof Error ? e.message : messages.common.unknownError),
      ),
    )

  return result.match(
    ({ executionId }) => {
      revalidatePath(routes.admin.workflow(workflowId))
      revalidatePath(routes.admin.workflowExecutions(workflowId))
      return { success: true as const, executionId }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- Template-based workflow creation ---

export async function createWorkflowFromTemplate(templateId: string) {
  const result = await zodParse(createWorkflowFromTemplateSchema, { templateId })
    .asyncAndThen((parsed) => {
      const template = WORKFLOW_TEMPLATES.find((t) => t.id === parsed.templateId)
      if (!template) return errAsync(messages.workflows.templateNotFound)
      return requireAuthResult('workflows').map((auth) => ({ template, auth }))
    })
    .andThen(({ template, auth }: { template: (typeof WORKFLOW_TEMPLATES)[number]; auth: AuthSuccess }) => {
      const { supabase, tenantId } = auth

      // Step 1: Insert workflow row
      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
        (supabase as any)
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
          .single(),
        dbError,
      )
        .andThen(fromSupabase<{ id: string }>())
        .map((row) => row.id)
        .andThen((workflowId) => {
          // Step 2: Build UUID remapping
          const idMap = new Map<string, string>()
          for (const step of template.steps) {
            idMap.set(step.tempId, crypto.randomUUID())
          }

          // Step 3: Insert workflow_steps with fresh UUIDs
          const insertStepsOp =
            template.steps.length > 0
              ? ResultAsync.fromPromise(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (supabase as any)
                    .from('workflow_steps')
                    .insert(
                      template.steps.map((step) => ({
                        id: idMap.get(step.tempId)!,
                        workflow_id: workflowId,
                        step_type: step.step_type,
                        step_config: step.step_config,
                        position_x: step.position_x,
                        position_y: step.position_y,
                      })),
                    ),
                  dbError,
                ).andThen(fromSupabaseVoid())
              : ResultAsync.fromSafePromise(Promise.resolve(undefined))

          return insertStepsOp
            .andThen(() => {
              // Step 4: Insert workflow_edges with remapped IDs
              if (template.edges.length === 0) {
                return ResultAsync.fromSafePromise(Promise.resolve(undefined))
              }

              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any)
                  .from('workflow_edges')
                  .insert(
                    template.edges.map((edge, index) => ({
                      workflow_id: workflowId,
                      source_step_id: idMap.get(edge.source_temp_id)!,
                      target_step_id: idMap.get(edge.target_temp_id)!,
                      condition_branch: edge.condition_branch ?? null,
                      sort_order: edge.sort_order ?? index,
                    })),
                  ),
                dbError,
              ).andThen(fromSupabaseVoid())
            })
            .map(() => ({ id: workflowId }))
        })
    })

  return result.match(
    (created) => {
      revalidatePath(routes.admin.workflows)
      return { success: true as const, data: created }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- Cancel execution ---

export async function cancelWorkflowExecution(executionId: string) {
  const result = await requireAuthResult('workflows')
    .andThen(({ tenantId }) => {
      const serviceClient = createServiceClient()

      // Fetch execution and verify tenant ownership
      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (serviceClient as any)
          .from('workflow_executions')
          .select('id, workflow_id, tenant_id, status')
          .eq('id', executionId)
          .maybeSingle(),
        dbError,
      )
        .andThen(fromSupabase<{ id: string; workflow_id: string; tenant_id: string; status: string }>())
        .andThen((execution) => {
          if (execution.tenant_id !== tenantId) {
            return err(messages.workflows.executionNotFound)
          }
          if (!['running', 'pending'].includes(execution.status)) {
            return err(messages.workflows.cancelOnlyRunning)
          }
          return ok(execution)
        })
        .andThen((execution) => {
          const now = new Date().toISOString()

          // Update execution status to cancelled
          return ResultAsync.fromPromise(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (serviceClient as any)
              .from('workflow_executions')
              .update({ status: 'cancelled', completed_at: now })
              .eq('id', executionId),
            dbError,
          )
            .andThen(fromSupabaseVoid())
            .andThen(() => {
              // Cancel all pending and running step executions (best-effort)
              return ResultAsync.fromPromise(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (serviceClient as any)
                  .from('workflow_step_executions')
                  .update({ status: 'cancelled', completed_at: now })
                  .eq('execution_id', executionId)
                  .in('status', ['pending', 'running']),
                dbError,
              )
                .andThen(fromSupabaseVoid())
                .orElse((stepErr) => {
                  console.error('[cancelWorkflowExecution] Failed to cancel step executions:', stepErr)
                  return ok(undefined)
                })
            })
            .map(() => execution.workflow_id)
        })
    })

  return result.match(
    (workflowId) => {
      revalidatePath(routes.admin.workflow(workflowId))
      revalidatePath(routes.admin.workflowExecutions(workflowId))
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}
