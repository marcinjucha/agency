import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ok, err, errAsync, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
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
import { messages } from '@/lib/messages'
import { type AuthContext, type StartClient, requireAuthContext } from '@/lib/server-auth.server'
import { generateStepSlug, isValidSlugFormat } from './utils/slug'

// Type-only imports — do NOT pull runtime modules into client bundles.
import type {
  ExecutionFilters,
  WorkflowSelectorOption,
  RetryWorkflowResult,
} from './handlers.server'

// Re-export handler types for component-side consumption (type-only — does not
// drag handlers.server.ts into client bundles).
export type { ExecutionFilters, WorkflowSelectorOption, RetryWorkflowResult }

// ---------------------------------------------------------------------------
// Server-only helpers — async wrappers around dynamic imports.
//
// WHY: Importing `./handlers.server`, `./templates/workflow-templates`,
// `./trigger-payload-validators`, `./utils/validate-steps`, or
// `@/lib/supabase/service` at the TOP LEVEL of this file causes a side-effect
// cascade that pulls `start-server-core/request-response` (which calls
// `new AsyncLocalStorage()` at import time) into client lazy chunks via
// WorkflowEditor → TestModePanel → @/features/workflows/server. The
// `.server.ts` strip-from-client mechanism handles direct `*.server.ts`
// imports but NOT the chain that flows through this barrel module.
//
// Fix: every server-only callable lives behind a dynamic `await import(...)`
// inside a server-fn handler lambda. Type-only imports (above) are safe.
// ---------------------------------------------------------------------------

/**
 * Public re-export — `apps/cms/app/routes/api/workflows/trigger.ts` calls this
 * directly (server route handler, runs only on the server). Async wrapper
 * around dynamic import to keep `handlers.server` off the top level.
 */
export async function dispatchToN8n(
  ...args: Parameters<typeof import('./handlers.server')['dispatchToN8nHandler']>
) {
  const mod = await import('./handlers.server')
  return mod.dispatchToN8nHandler(...args)
}

export async function fetchWorkflowForPublicTrigger(
  ...args: Parameters<typeof import('./handlers.server')['fetchWorkflowForPublicTriggerHandler']>
) {
  const mod = await import('./handlers.server')
  return mod.fetchWorkflowForPublicTriggerHandler(...args)
}

/**
 * Serializable subset of StepValidationError — the full type carries Zod's
 * ZodIssue[] which has `unknown`-typed fields that TanStack Start RPC can't
 * serialize. We send only the fields the client needs to surface.
 */
interface InvalidStepSummary {
  stepId: string
  stepType: string
  summary: string
}

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Create a new workflow.
 * TanStack Start port of features/workflows/actions.ts#createWorkflow.
 */
export const createWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateWorkflowFormData) => createWorkflowSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: { id: string; name: string }; error?: string }> => {
      const result = await requireAuthContext().andThen((auth) => insertWorkflow(auth, data))

      return result.match(
        (workflow) => ({ success: true, data: { id: workflow.id, name: workflow.name } }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Update workflow metadata.
 * TanStack Start port of features/workflows/actions.ts#updateWorkflow.
 */
export const updateWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: UpdateWorkflowFormData }) => {
    updateWorkflowSchema.parse(input.data)
    return input
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: { id: string; name: string }; error?: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        patchWorkflow(auth, data.id, data.data)
      )

      return result.match(
        (workflow) => ({ success: true, data: { id: workflow.id, name: workflow.name } }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Delete a workflow.
 * TanStack Start port of features/workflows/actions.ts#deleteWorkflow.
 */
export const deleteWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      deleteWorkflowRow(auth, data.id)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Toggle workflow active/inactive.
 * TanStack Start port of features/workflows/actions.ts#toggleWorkflowActive.
 */
export const toggleWorkflowActiveFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; isActive: boolean }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      setWorkflowActive(auth, data.id, data.isActive)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Save the visual canvas (bulk upsert steps + edges).
 * TanStack Start port of features/workflows/actions.ts#saveWorkflowCanvas.
 */
export const saveWorkflowCanvasFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { workflowId: string; data: SaveCanvasFormData }) => {
    saveCanvasSchema.parse(input.data)
    return input
  })
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean
      error?: string
      invalidSteps?: InvalidStepSummary[]
    }> => {
      // Defensive re-validation: client-side gate is the primary defense, but
      // re-validating here prevents bypass via direct API calls or stale cache.
      const { validateAllSteps } = await import('./utils/validate-steps')
      const validation = validateAllSteps(
        data.data.steps.map((s) => ({
          id: s.id ?? crypto.randomUUID(),
          step_type: s.step_type,
          step_config: s.step_config,
        }))
      )
      if (!validation.isValid) {
        return {
          success: false,
          error: messages.workflows.editor.validationFailed,
          invalidSteps: validation.errors.map((e) => ({
            stepId: e.stepId,
            stepType: e.stepType,
            summary: e.summary,
          })),
        }
      }

      const result = await requireAuthContext().andThen((auth) =>
        bulkSaveCanvas(auth, data.workflowId, data.data)
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Rename a step's slug.
 * Validates format (camelCase), uniqueness within the workflow, and tenant ownership.
 */
export const updateStepSlugFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { stepId: string; newSlug: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: { id: string; slug: string }; error?: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        renameStepSlug(auth, data.stepId, data.newSlug)
      )

      return result.match(
        (row) => ({ success: true, data: row }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Trigger a manual workflow execution via n8n Orchestrator.
 * TanStack Start port of features/workflows/actions.ts#triggerManualWorkflow.
 */
export const triggerManualWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { workflowId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; executionId?: string; error?: string }> => {
      const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
      if (!n8nUrl) {
        return { success: false, error: 'N8N_WORKFLOW_ORCHESTRATOR_URL not configured' }
      }

      const result = await requireAuthContext()
        .andThen(({ supabase, tenantId }) => verifyManualWorkflow(supabase, tenantId, data.workflowId))
        .andThen(({ tenantId }) =>
          ResultAsync.fromPromise(
            dispatchToN8n(n8nUrl, data.workflowId, tenantId, { trigger_type: 'manual' }),
            dbError,
          ).andThen((r) => r),
        )

      return result.match(
        ({ executionId }) => ({ success: true, executionId }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Test workflow dispatch (custom trigger payload).
 * TanStack Start port of features/workflows/actions.ts#testWorkflow.
 */
export const testWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { workflowId: string; triggerPayload: Record<string, unknown> }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; executionId?: string; error?: string }> => {
      const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
      if (!n8nUrl) {
        return { success: false, error: 'N8N_WORKFLOW_ORCHESTRATOR_URL not configured' }
      }

      const { validateSurveyLinkIdInPayload } = await import('./trigger-payload-validators')

      const result = await requireAuthContext()
        .andThen(({ supabase, tenantId }) =>
          fetchWorkflowForTest(supabase, tenantId, data.workflowId).map(
            (meta) => ({ ...meta, supabase })
          )
        )
        .andThen(({ tenantId, triggerType, supabase }) =>
          validateSurveyLinkIdInPayload(
            supabase,
            triggerType,
            data.triggerPayload,
            tenantId
          ).map(() => ({ tenantId, triggerType }))
        )
        .andThen(({ tenantId, triggerType }) =>
          ResultAsync.fromPromise(
            dispatchToN8n(n8nUrl, data.workflowId, tenantId, {
              trigger_type: triggerType,
              ...data.triggerPayload,
            }),
            dbError,
          ).andThen((r) => r),
        )

      return result.match(
        ({ executionId }) => ({ success: true, executionId }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Cancel a workflow execution.
 * TanStack Start port of features/workflows/actions.ts#cancelWorkflowExecution.
 */
export const cancelWorkflowExecutionFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { executionId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen(({ tenantId }) =>
      cancelExecution(tenantId, data.executionId)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Create workflow from template.
 * TanStack Start port of features/workflows/actions.ts#createWorkflowFromTemplate.
 */
export const createWorkflowFromTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { templateId: string }) =>
    createWorkflowFromTemplateSchema.parse(input)
  )
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
      const { WORKFLOW_TEMPLATES } = await import('./templates/workflow-templates')

      const result = await requireAuthContext()
        .andThen((auth) => {
          const template = WORKFLOW_TEMPLATES.find((t) => t.id === data.templateId)
          if (!template) {
            return errAsync(messages.workflows.templateNotFound)
          }
          return insertWorkflowFromTemplate(auth, template)
        })

      return result.match(
        (created) => ({ success: true, data: { id: created.id } }),
        (error) => ({ success: false, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Query Server Functions (createServerFn wrappers around handlers.server.ts)
//
// All `await import('./handlers.server')` calls keep the server-only module
// out of the client bundle — see top-of-file note.
// ---------------------------------------------------------------------------

export const getWorkflowsFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { getWorkflowsHandler } = await import('./handlers.server')
  return getWorkflowsHandler()
})

export const getWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { getWorkflowHandler } = await import('./handlers.server')
    return getWorkflowHandler(data.id)
  })

export const getWorkflowsForSelectorFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { triggerType?: string }) => input)
  .handler(async ({ data }) => {
    const { getWorkflowsForSelectorHandler } = await import('./handlers.server')
    return getWorkflowsForSelectorHandler(data.triggerType)
  })

export const getWorkflowExecutionsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      workflowId: string
      options?: { limit?: number; offset?: number; excludeDryRuns?: boolean }
    }) => input,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Start serialization check trips on JSONB-derived `Json` types in WorkflowExecution; same pattern as blog/server.ts.
  .handler(async ({ data }) => {
    const { getWorkflowExecutionsHandler } = await import('./handlers.server')
    return getWorkflowExecutionsHandler(data.workflowId, data.options) as any
  })

export const getEmailTemplatesForWorkflowFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { getEmailTemplatesWithBodyHandler } = await import('./handlers.server')
    return getEmailTemplatesWithBodyHandler()
  },
)

export const getEmailTemplatesForWorkflowLightFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { getEmailTemplatesForWorkflowHandler } = await import('./handlers.server')
    return getEmailTemplatesForWorkflowHandler()
  },
)

export const getSurveysForWorkflowFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { getSurveysForWorkflowHandler } = await import('./handlers.server')
  return getSurveysForWorkflowHandler()
})

export const getAllExecutionsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      filters?: ExecutionFilters
      options?: { limit?: number; offset?: number }
    }) => input,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Start serialization check trips on JSONB-derived `Json`.
  .handler(async ({ data }) => {
    const { getAllExecutionsHandler } = await import('./handlers.server')
    return getAllExecutionsHandler(data.filters, data.options) as any
  })

export const getExecutionWithStepsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { executionId: string }) =>
    z.object({ executionId: z.string().uuid() }).parse(input),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Start serialization check trips on JSONB-derived `Json`.
  .handler(async ({ data }) => {
    const { getExecutionWithStepsHandler } = await import('./handlers.server')
    return getExecutionWithStepsHandler(data.executionId) as any
  })

// ---------------------------------------------------------------------------
// Retry server function — replaces app/routes/api/workflows/retry.ts
// ---------------------------------------------------------------------------

export const retryWorkflowExecutionFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { executionId: string }) =>
    z.object({ executionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { retryWorkflowExecutionHandler } = await import('./handlers.server')
    return retryWorkflowExecutionHandler(data)
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function insertWorkflow(auth: AuthContext, parsed: CreateWorkflowFormData) {
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
    (auth.supabase as any).from('workflows').insert(payload).select().single(),
    dbError
  )
    .andThen(fromSupabase<Record<string, unknown>>())
    .map(toWorkflow)
}

function patchWorkflow(auth: AuthContext, id: string, data: UpdateWorkflowFormData) {
  const updatePayload: Record<string, unknown> = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.description !== undefined) updatePayload.description = data.description || null
  if (data.trigger_type !== undefined) updatePayload.trigger_type = data.trigger_type
  if (data.trigger_config !== undefined) updatePayload.trigger_config = data.trigger_config
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    (auth.supabase as any).from('workflows').update(updatePayload).eq('id', id).select().single(),
    dbError
  )
    .andThen(fromSupabase<Record<string, unknown>>())
    .map(toWorkflow)
}

function deleteWorkflowRow(auth: AuthContext, id: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    (auth.supabase as any).from('workflows').delete().eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function renameStepSlug(auth: AuthContext, stepId: string, rawSlug: string) {
  const newSlug = rawSlug.trim()

  if (newSlug.length === 0) {
    return errAsync(messages.workflows.editor.slugEmpty)
  }
  if (!isValidSlugFormat(newSlug)) {
    return errAsync(messages.workflows.editor.slugInvalidFormat)
  }

  const { supabase, tenantId } = auth

  // 1. Load the step + its workflow to verify tenant ownership.
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflow_steps')
      .select('id, slug, workflow_id, workflows!inner(tenant_id)')
      .eq('id', stepId)
      .maybeSingle(),
    dbError
  )
    .andThen(
      fromSupabase<{
        id: string
        slug: string
        workflow_id: string
        workflows: { tenant_id: string } | { tenant_id: string }[]
      }>()
    )
    .andThen((row) => {
      const tenantOnRow = Array.isArray(row.workflows)
        ? row.workflows[0]?.tenant_id
        : row.workflows?.tenant_id
      if (tenantOnRow !== tenantId) {
        return errAsync(messages.workflows.workflowNotFound)
      }
      if (row.slug === newSlug) {
        // No-op rename — return current row.
        return ResultAsync.fromSafePromise(
          Promise.resolve({ id: row.id, slug: row.slug, workflow_id: row.workflow_id })
        )
      }
      return ResultAsync.fromSafePromise(Promise.resolve(row)).andThen((r) =>
        ensureSlugAvailable(supabase, r.workflow_id, stepId, newSlug).map(() => ({
          id: r.id,
          slug: r.slug,
          workflow_id: r.workflow_id,
        }))
      )
    })
    .andThen((row) => {
      if (row.slug === newSlug) {
        return ResultAsync.fromSafePromise(Promise.resolve({ id: row.id, slug: newSlug }))
      }
      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('workflow_steps')
          .update({ slug: newSlug })
          .eq('id', stepId),
        dbError
      )
        .andThen(fromSupabaseVoid())
        .map(() => ({ id: row.id, slug: newSlug }))
    })
}

function ensureSlugAvailable(
  supabase: StartClient,
  workflowId: string,
  stepId: string,
  newSlug: string
) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflow_steps')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('slug', newSlug)
      .neq('id', stepId)
      .maybeSingle(),
    dbError
  ).andThen((response) => {
    const res = response as { data: { id: string } | null; error: { message: string } | null }
    if (res.error) return err(res.error.message)
    if (res.data) return err(messages.workflows.editor.slugAlreadyUsed)
    return ok(undefined)
  })
}

function setWorkflowActive(auth: AuthContext, id: string, isActive: boolean) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    (auth.supabase as any).from('workflows').update({ is_active: isActive }).eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function bulkSaveCanvas(auth: AuthContext, workflowId: string, parsed: SaveCanvasFormData) {
  const { supabase } = auth

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('workflow_steps').select('id, slug').eq('workflow_id', workflowId),
    dbError
  )
    .andThen(fromSupabase<{ id: string; slug: string }[]>())
    .andThen((existingSteps) => {
      const existingStepIds = new Set<string>(existingSteps.map((s) => s.id))
      const incomingStepIds = new Set<string>(
        parsed.steps.filter((s): s is typeof s & { id: string } => !!s.id).map((s) => s.id)
      )

      const stepsToDelete = [...existingStepIds].filter((id) => !incomingStepIds.has(id))
      const deleteStepsOp =
        stepsToDelete.length > 0
          ? ResultAsync.fromPromise(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any).from('workflow_steps').delete().in('id', stepsToDelete),
              dbError
            ).andThen(fromSupabaseVoid())
          : ResultAsync.fromSafePromise(Promise.resolve(undefined))

      // Build slug map (id → slug) for steps already in DB; new steps get auto-gen.
      const existingSlugById = new Map(existingSteps.map((s) => [s.id, s.slug]))
      const stepsWithSlugs = ensureStepSlugs(parsed.steps, existingSlugById, stepsToDelete)

      return deleteStepsOp
        .andThen(() => upsertSteps(supabase, workflowId, stepsWithSlugs))
        .andThen(() => deleteAllEdges(supabase, workflowId))
        .andThen(() => insertEdges(supabase, workflowId, parsed.edges))
        .andThen(() => syncTriggerType(supabase, workflowId, stepsWithSlugs))
    })
}

/**
 * Resolve slugs for every step before INSERT/UPSERT.
 * - Step with explicit `slug` (panel-renamed) → keep it.
 * - Step with `id` already in DB → reuse persisted slug.
 * - New step (no id-match in DB, no slug) → generate from step_type, avoiding collisions.
 *
 * Steps marked for deletion are excluded from the in-flight slug pool so freed slugs
 * become reusable in the same save.
 */
function ensureStepSlugs(
  steps: SaveCanvasFormData['steps'],
  existingSlugById: Map<string, string>,
  stepsToDelete: string[]
): Array<SaveCanvasFormData['steps'][number] & { slug: string }> {
  const deletedSet = new Set(stepsToDelete)
  const usedSlugs = new Set<string>()

  // Pre-collect explicit slugs from incoming payload.
  for (const step of steps) {
    if (step.slug) usedSlugs.add(step.slug)
  }
  // Add persisted slugs that survive this save.
  for (const [id, slug] of existingSlugById) {
    if (!deletedSet.has(id)) usedSlugs.add(slug)
  }

  return steps.map((step) => {
    if (step.slug) return { ...step, slug: step.slug }
    if (step.id && existingSlugById.has(step.id)) {
      return { ...step, slug: existingSlugById.get(step.id) as string }
    }
    const generated = generateStepSlug(step.step_type, [...usedSlugs])
    usedSlugs.add(generated)
    return { ...step, slug: generated }
  })
}

function upsertSteps(
  supabase: StartClient,
  workflowId: string,
  steps: Array<SaveCanvasFormData['steps'][number] & { slug: string }>
) {
  if (steps.length === 0) return ResultAsync.fromSafePromise(Promise.resolve(undefined))

  const payload = steps.map((step) => ({
    ...(step.id ? { id: step.id } : {}),
    workflow_id: workflowId,
    step_type: step.step_type,
    step_config: step.step_config,
    slug: step.slug,
    position_x: step.position_x,
    position_y: step.position_y,
  }))

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('workflow_steps').upsert(payload, { onConflict: 'id' }),
    dbError
  ).andThen(fromSupabaseVoid())
}

function deleteAllEdges(supabase: StartClient, workflowId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('workflow_edges').delete().eq('workflow_id', workflowId),
    dbError
  ).andThen(fromSupabaseVoid())
}

function insertEdges(supabase: StartClient, workflowId: string, edges: SaveCanvasFormData['edges']) {
  if (edges.length === 0) return ResultAsync.fromSafePromise(Promise.resolve(undefined))

  const payload = edges.map((edge) => ({
    workflow_id: workflowId,
    source_step_id: edge.source_step_id,
    target_step_id: edge.target_step_id,
    condition_branch: edge.condition_branch || null,
    sort_order: edge.sort_order,
  }))

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('workflow_edges').insert(payload),
    dbError
  ).andThen(fromSupabaseVoid())
}

function syncTriggerType(
  supabase: StartClient,
  workflowId: string,
  steps: SaveCanvasFormData['steps']
) {
  const triggerTypes = new Set([
    'survey_submitted',
    'booking_created',
    'lead_scored',
    'manual',
    'scheduled',
  ])
  const triggerStep = steps.find((s) => triggerTypes.has(s.step_type))
  if (!triggerStep) return ResultAsync.fromSafePromise(Promise.resolve(undefined))

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflows')
      .update({ trigger_type: triggerStep.step_type })
      .eq('id', workflowId),
    dbError
  ).andThen(fromSupabaseVoid())
}

function verifyManualWorkflow(supabase: StartClient, tenantId: string, workflowId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type')
      .eq('id', workflowId)
      .maybeSingle(),
    () => messages.common.unknownError
  )
    .andThen(fromSupabase<{ id: string; tenant_id: string; trigger_type: string }>())
    .andThen((workflow) => {
      if (workflow.tenant_id !== tenantId) return err(messages.workflows.workflowNotFound)
      if (workflow.trigger_type !== 'manual') return err(messages.workflows.notManualTrigger)
      return ok({ tenantId })
    })
}

function fetchWorkflowForTest(supabase: StartClient, tenantId: string, workflowId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type, is_active')
      .eq('id', workflowId)
      .maybeSingle(),
    dbError
  )
    .andThen(fromSupabase<{ id: string; tenant_id: string; trigger_type: string; is_active: boolean }>())
    .andThen((workflow) => {
      if (workflow.tenant_id !== tenantId) return err(messages.workflows.workflowNotFound)
      // Fast-fail when caller bypasses the disabled UI button (e.g. DevTools, direct RPC).
      // The button itself is gated on isActive in TestModePanel; this is defense in depth.
      if (!workflow.is_active) return err(messages.workflows.workflowInactiveCannotTest)
      return ok({ tenantId, triggerType: workflow.trigger_type })
    })
}

function cancelExecution(tenantId: string, executionId: string) {
  // Dynamic import — keeps `@/lib/supabase/service` off the top level.
  // Wrap the import-then-build chain in a ResultAsync so callers can `.andThen`.
  return ResultAsync.fromPromise(
    import('@/lib/supabase/service').then((m) => m.createServiceClient()),
    dbError,
  ).andThen((serviceClient) =>
    ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (serviceClient as any)
      .from('workflow_executions')
      .select('id, workflow_id, tenant_id, status')
      .eq('id', executionId)
      .maybeSingle(),
    dbError
  )
    .andThen(fromSupabase<{ id: string; workflow_id: string; tenant_id: string; status: string }>())
    .andThen((execution) => {
      if (execution.tenant_id !== tenantId) return err(messages.workflows.executionNotFound)
      if (!['running', 'pending'].includes(execution.status)) {
        return err(messages.workflows.cancelOnlyRunning)
      }
      return ok(execution)
    })
    .andThen((execution) => {
      const now = new Date().toISOString()

      return ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (serviceClient as any)
          .from('workflow_executions')
          .update({ status: 'cancelled', completed_at: now })
          .eq('id', executionId),
        dbError
      )
        .andThen(fromSupabaseVoid())
        .andThen(() =>
          ResultAsync.fromPromise(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (serviceClient as any)
              .from('workflow_step_executions')
              .update({ status: 'cancelled', completed_at: now })
              .eq('execution_id', executionId)
              .in('status', ['pending', 'running']),
            dbError
          )
            .andThen(fromSupabaseVoid())
            .orElse((stepErr) => {
              console.error('[cancelExecution] Failed to cancel step executions:', stepErr)
              return ok(undefined)
            })
        )
        .map(() => execution.workflow_id)
    }),
  )
}

function insertWorkflowFromTemplate(
  auth: AuthContext,
  template: WorkflowTemplateValue,
) {
  const { supabase, tenantId } = auth

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
    dbError
  )
    .andThen(fromSupabase<{ id: string }>())
    .map((row) => row.id)
    .andThen((workflowId) => {
      const idMap = new Map<string, string>()
      for (const step of template.steps) {
        idMap.set(step.tempId, crypto.randomUUID())
      }

      const usedSlugs: string[] = []
      const stepsWithSlugs = template.steps.map((step) => {
        const slug = generateStepSlug(String(step.step_type), usedSlugs)
        usedSlugs.push(slug)
        return {
          id: idMap.get(step.tempId)!,
          workflow_id: workflowId,
          step_type: step.step_type,
          step_config: step.step_config,
          position_x: step.position_x,
          position_y: step.position_y,
          slug,
        }
      })

      const insertStepsOp =
        template.steps.length > 0
          ? ResultAsync.fromPromise(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any).from('workflow_steps').insert(stepsWithSlugs),
              dbError
            ).andThen(fromSupabaseVoid())
          : ResultAsync.fromSafePromise(Promise.resolve(undefined))

      return insertStepsOp
        .andThen(() => {
          if (template.edges.length === 0) {
            return ResultAsync.fromSafePromise(Promise.resolve(undefined))
          }

          return ResultAsync.fromPromise(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('workflow_edges').insert(
              template.edges.map((edge, index) => ({
                workflow_id: workflowId,
                source_step_id: idMap.get(edge.source_temp_id)!,
                target_step_id: idMap.get(edge.target_temp_id)!,
                condition_branch: edge.condition_branch ?? null,
                sort_order: edge.sort_order ?? index,
              }))
            ),
            dbError
          ).andThen(fromSupabaseVoid())
        })
        .map(() => ({ id: workflowId }))
    })
}

// Type-only import of the array element shape. `import type` with a deep-type
// expression is erased at compile time — does NOT pull templates into client.
type WorkflowTemplateValue = (typeof import('./templates/workflow-templates'))['WORKFLOW_TEMPLATES'][number]
