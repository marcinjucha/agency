import { createServerFn } from '@tanstack/react-start'
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
import {
  toWorkflow,
  toWorkflowListItem,
  toWorkflowStep,
  toWorkflowEdge,
  type WorkflowListItem,
  type WorkflowWithSteps,
  type EmailTemplateOption,
  type EmailTemplateWithBody,
  type SurveyOption,
} from './types'
import { createServiceClient } from '@/lib/supabase/service'
import { messages } from '@/lib/messages'
import { WORKFLOW_TEMPLATES } from './templates/workflow-templates'
import { createServerClient } from '@/lib/supabase/server-start'
import { type AuthContext, type StartClient, requireAuthContext } from '@/lib/server-auth'
import { generateStepSlug, isValidSlugFormat } from './utils/slug'
import { validateSurveyLinkIdInPayload } from './trigger-payload-validators'

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
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      bulkSaveCanvas(auth, data.workflowId, data.data)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

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
          dispatchToN8n(n8nUrl, data.workflowId, tenantId, { trigger_type: 'manual' })
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
          dispatchToN8n(n8nUrl, data.workflowId, tenantId, {
            trigger_type: triggerType,
            ...data.triggerPayload,
          })
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
// Query Server Functions (used by route loaders)
// ---------------------------------------------------------------------------

const LIST_FIELDS = 'id, name, description, trigger_type, is_active, created_at, updated_at' as const

/**
 * Fetch the workflow list. Called from the /admin/workflows/ loader.
 *
 * Query fns throw on error (rather than returning Result) because they are
 * used with ensureQueryData — TanStack Query expects throws, not structured
 * error returns, to trigger its error handling + retry behaviour.
 */
export const getWorkflowsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<WorkflowListItem[]> => {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select(LIST_FIELDS)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(toWorkflowListItem)
})

/**
 * Fetch a single workflow with steps and edges. Called from the /admin/workflows/$workflowId loader.
 * Throws on error — ensureQueryData expects throws, not Result, to trigger TanStack Query error handling.
 */
export const getWorkflowFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<WorkflowWithSteps> => {
    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
    const { data: workflowData, error: workflowError } = await (supabase as any)
      .from('workflows')
      .select('*')
      .eq('id', data.id)
      .maybeSingle()

    if (workflowError) throw new Error(workflowError.message)
    if (!workflowData) throw new Error(messages.workflows.workflowNotFound)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stepsData, error: stepsError } = await (supabase as any)
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', data.id)
      .order('created_at', { ascending: true })

    if (stepsError) throw new Error(stepsError.message)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: edgesData, error: edgesError } = await (supabase as any)
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', data.id)
      .order('sort_order', { ascending: true })

    if (edgesError) throw new Error(edgesError.message)

    const workflow = toWorkflow(workflowData)
    return {
      ...workflow,
      steps: (stepsData || []).map(toWorkflowStep),
      edges: (edgesData || []).map(toWorkflowEdge),
    }
  })

/**
 * Fetch lightweight survey list for TriggerConfigPanel dropdown.
 * Called from the /admin/workflows/$workflowId loader.
 * Throws on error — ensureQueryData expects throws, not Result, to trigger TanStack Query error handling.
 */
export const getSurveysForWorkflowFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<SurveyOption[]> => {
    const supabase = createServerClient()

    const { data, error } = await supabase.from('surveys').select('id, title').order('title')

    if (error) throw new Error(error.message)
    return (data || []) as SurveyOption[]
  }
)

/**
 * Fetch email templates for SendEmailConfigPanel dropdown with html_body for variable extraction.
 * html_body is needed to extract {{placeholder}} variables from the template for the binding table.
 * Called from the /admin/workflows/$workflowId loader.
 * Throws on error — ensureQueryData expects throws, not Result, to trigger TanStack Query error handling.
 */
export const getEmailTemplatesForWorkflowFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<EmailTemplateWithBody[]> => {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('email_templates')
      .select('id, type, subject, html_body')
      .order('type')

    if (error) throw new Error(error.message)
    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      subject: row.subject,
      html_body: (row.html_body as string) ?? '',
    }))
  }
)

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

/**
 * Fetch workflow for the public trigger entry point.
 * Uses service role (no user session). Verifies:
 * - workflow exists
 * - workflow is active
 * - trigger_type matches the requested action
 *
 * Returns the workflow's tenant_id — caller-supplied tenant_id is NEVER trusted.
 *
 * Why service role: the public /api/workflows/trigger route authenticates via
 * Bearer secret, not user cookies, so RLS-aware client wouldn't find the row.
 */
export function fetchWorkflowForPublicTrigger(
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
      data: { id: string; tenant_id: string; trigger_type: string; is_active: boolean } | null
      error: { message: string } | null
    }>,
    dbError,
  ).andThen((res) => {
    if (res.error) return err(res.error.message)
    const workflow = res.data
    if (!workflow) return err('workflow_not_found')
    if (!workflow.is_active) return err('workflow_not_active')
    if (workflow.trigger_type !== triggerType) return err('trigger_type_mismatch')
    return ok({ tenantId: workflow.tenant_id })
  })
}

function fetchWorkflowForTest(supabase: StartClient, tenantId: string, workflowId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('workflows')
      .select('id, tenant_id, trigger_type')
      .eq('id', workflowId)
      .maybeSingle(),
    dbError
  )
    .andThen(fromSupabase<{ id: string; tenant_id: string; trigger_type: string }>())
    .andThen((workflow) => {
      if (workflow.tenant_id !== tenantId) return err(messages.workflows.workflowNotFound)
      return ok({ tenantId, triggerType: workflow.trigger_type })
    })
}

export function dispatchToN8n(
  n8nUrl: string,
  workflowId: string,
  tenantId: string,
  triggerPayload: Record<string, unknown>
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
    (e) => (e instanceof Error ? e.message : messages.common.unknownError)
  )
}

function cancelExecution(tenantId: string, executionId: string) {
  const serviceClient = createServiceClient()

  return ResultAsync.fromPromise(
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
    })
}

function insertWorkflowFromTemplate(
  auth: AuthContext,
  template: (typeof WORKFLOW_TEMPLATES)[number]
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
