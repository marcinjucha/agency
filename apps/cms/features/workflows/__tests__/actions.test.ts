import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('../validation', () => ({
  createWorkflowSchema: { safeParse: vi.fn() },
  updateWorkflowSchema: { safeParse: vi.fn() },
  saveCanvasSchema: { safeParse: vi.fn() },
  createWorkflowFromTemplateSchema: { safeParse: vi.fn() },
}))

vi.mock('../types', () => ({
  toWorkflow: vi.fn((d: unknown) => d),
}))

vi.mock('../engine/executor', () => ({
  executeWorkflow: vi.fn(),
}))

const mockServiceClient: Record<string, any> = {}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}))

vi.mock('@/lib/messages', () => ({
  messages: {
    common: { invalidData: 'Invalid data', unknownError: 'Unknown error' },
    workflows: {
      workflowNotFound: 'Workflow not found',
      notManualTrigger: 'Not a manual trigger',
      templateNotFound: 'Template not found',
      executionNotFound: 'Execution not found',
      cancelOnlyRunning: 'Can only cancel running executions',
    },
  },
}))

vi.mock('@/lib/routes', () => ({
  routes: {
    admin: {
      workflows: '/admin/workflows',
      workflow: (id: string) => `/admin/workflows/${id}`,
      workflowEditor: (id: string) => `/admin/workflows/${id}/editor`,
      workflowExecutions: (id: string) => `/admin/workflows/${id}/executions`,
    },
  },
}))

vi.mock('../templates/workflow-templates', () => ({
  WORKFLOW_TEMPLATES: [
    {
      id: 'tpl-1',
      name: 'Test Template',
      description: 'A test template',
      trigger_type: 'survey_submitted',
      trigger_config: {},
      steps: [
        {
          tempId: 'tmp-trigger',
          step_type: 'survey_submitted',
          step_config: { type: 'survey_submitted' },
          position_x: 0,
          position_y: 0,
        },
        {
          tempId: 'tmp-email',
          step_type: 'send_email',
          step_config: { type: 'send_email' },
          position_x: 200,
          position_y: 0,
        },
      ],
      edges: [
        {
          source_temp_id: 'tmp-trigger',
          target_temp_id: 'tmp-email',
          condition_branch: null,
          sort_order: 0,
        },
      ],
    },
  ],
}))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  saveCanvasSchema,
  createWorkflowFromTemplateSchema,
} from '../validation'
import { executeWorkflow } from '../engine/executor'
import {
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflowActive,
  saveWorkflowCanvas,
  triggerManualWorkflow,
  createWorkflowFromTemplate,
  cancelWorkflowExecution,
} from '../actions'

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>
const mockExecuteWorkflow = executeWorkflow as ReturnType<typeof vi.fn>

// --- Helpers ---

import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { mockAuthSuccess, mockAuthFailure } from '@/__tests__/utils/auth-mocks'

function setupSequentialFrom(supabase: any, ...chains: any[]) {
  let callIndex = 0
  supabase.from = vi.fn(() => {
    const chain = chains[callIndex] ?? chains[chains.length - 1]
    callIndex++
    return chain
  })
}

function setupServiceFrom(...chains: any[]) {
  let callIndex = 0
  mockServiceClient.from = vi.fn(() => {
    const chain = chains[callIndex] ?? chains[chains.length - 1]
    callIndex++
    return chain
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =========================================================================
// createWorkflow
// =========================================================================

describe('createWorkflow', () => {
  const validData = {
    name: 'My Workflow',
    description: 'A test workflow',
    trigger_type: 'manual' as const,
    trigger_config: {},
    is_active: false,
  }

  it('returns validation error when data is invalid', async () => {
    ;(createWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: false,
      error: { errors: [{ message: 'Name required' }] },
    })

    const result = await createWorkflow({} as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Name required')
  })

  it('returns auth error when not authenticated', async () => {
    ;(createWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await createWorkflow(validData as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('inserts workflow with tenant_id and returns data', async () => {
    ;(createWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const createdRow = { id: 'wf-1', ...validData, tenant_id: 'tenant-1' }
    const insertChain = mockChain({ data: createdRow, error: null })
    auth._supabase.from = vi.fn(() => insertChain)

    const result = await createWorkflow(validData as any)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(createdRow)
    expect(auth._supabase.from).toHaveBeenCalledWith('workflows')
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1', name: 'My Workflow' })
    )
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')
  })

  it('returns error when supabase insert fails', async () => {
    ;(createWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const insertChain = mockChain({ data: null, error: { message: 'DB error' } })
    auth._supabase.from = vi.fn(() => insertChain)

    const result = await createWorkflow(validData as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

// =========================================================================
// updateWorkflow
// =========================================================================

describe('updateWorkflow', () => {
  const validData = { name: 'Updated Name' }

  it('applies partial update and revalidates', async () => {
    ;(updateWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const updatedRow = { id: 'wf-1', name: 'Updated Name', tenant_id: 'tenant-1' }
    const updateChain = mockChain({ data: updatedRow, error: null })
    auth._supabase.from = vi.fn(() => updateChain)

    const result = await updateWorkflow('wf-1', validData as any)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(updatedRow)
    expect(updateChain.update).toHaveBeenCalledWith({ name: 'Updated Name' })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1')
  })

  it('returns auth error when not authenticated', async () => {
    ;(updateWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await updateWorkflow('wf-1', validData as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when supabase update fails', async () => {
    ;(updateWorkflowSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: validData,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const updateChain = mockChain({ data: null, error: { message: 'Update failed' } })
    auth._supabase.from = vi.fn(() => updateChain)

    const result = await updateWorkflow('wf-1', validData as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

// =========================================================================
// deleteWorkflow
// =========================================================================

describe('deleteWorkflow', () => {
  it('deletes workflow and revalidates', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    // delete chain needs .then to resolve (no .single)
    const deleteChain = mockChain(undefined)
    deleteChain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve)
    auth._supabase.from = vi.fn(() => deleteChain)

    const result = await deleteWorkflow('wf-1')

    expect(result.success).toBe(true)
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')
  })

  it('returns auth error when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await deleteWorkflow('wf-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })
})

// =========================================================================
// toggleWorkflowActive
// =========================================================================

describe('toggleWorkflowActive', () => {
  it('sets is_active to true', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const toggleChain = mockChain(undefined)
    toggleChain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve)
    auth._supabase.from = vi.fn(() => toggleChain)

    const result = await toggleWorkflowActive('wf-1', true)

    expect(result.success).toBe(true)
    expect(toggleChain.update).toHaveBeenCalledWith({ is_active: true })
    expect(toggleChain.eq).toHaveBeenCalledWith('id', 'wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1')
  })

  it('sets is_active to false', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const toggleChain = mockChain(undefined)
    toggleChain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve)
    auth._supabase.from = vi.fn(() => toggleChain)

    const result = await toggleWorkflowActive('wf-1', false)

    expect(result.success).toBe(true)
    expect(toggleChain.update).toHaveBeenCalledWith({ is_active: false })
  })

  it('returns auth error when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await toggleWorkflowActive('wf-1', true)

    expect(result.success).toBe(false)
  })
})

// =========================================================================
// saveWorkflowCanvas
// =========================================================================

describe('saveWorkflowCanvas', () => {
  const canvasData = {
    steps: [
      { id: 'step-1', step_type: 'survey_submitted', step_config: {}, position_x: 0, position_y: 0 },
      { id: 'step-2', step_type: 'send_email', step_config: {}, position_x: 200, position_y: 0 },
    ],
    edges: [
      {
        source_step_id: 'step-1',
        target_step_id: 'step-2',
        condition_branch: null,
        sort_order: 0,
      },
    ],
  }

  it('returns validation error when data is invalid', async () => {
    ;(saveCanvasSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: false,
      error: { errors: [{ message: 'Invalid canvas' }] },
    })

    const result = await saveWorkflowCanvas('wf-1', {} as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid canvas')
  })

  it('returns auth error when not authenticated', async () => {
    ;(saveCanvasSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: canvasData,
    })
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await saveWorkflowCanvas('wf-1', canvasData as any)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('fetches existing steps, deletes removed, upserts, syncs trigger_type', async () => {
    ;(saveCanvasSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: canvasData,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    // Chain 1: fetch existing steps — returns step-1 + step-old (step-old should be deleted)
    const fetchStepsChain = mockChain(undefined)
    fetchStepsChain.then = (resolve: any) =>
      Promise.resolve({ data: [{ id: 'step-1' }, { id: 'step-old' }], error: null }).then(resolve)

    // Chain 2: delete removed steps (step-old)
    const deleteStepsChain = mockChain(undefined)
    deleteStepsChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 3: upsert steps
    const upsertStepsChain = mockChain(undefined)
    upsertStepsChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 4: delete all edges
    const deleteEdgesChain = mockChain(undefined)
    deleteEdgesChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 5: insert new edges
    const insertEdgesChain = mockChain(undefined)
    insertEdgesChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 6: sync trigger_type on workflow row
    const syncTriggerChain = mockChain(undefined)
    syncTriggerChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    setupSequentialFrom(
      auth._supabase,
      fetchStepsChain,
      deleteStepsChain,
      upsertStepsChain,
      deleteEdgesChain,
      insertEdgesChain,
      syncTriggerChain
    )

    const result = await saveWorkflowCanvas('wf-1', canvasData as any)

    expect(result.success).toBe(true)

    // Verify delete of removed step
    expect(deleteStepsChain.delete).toHaveBeenCalled()
    expect(deleteStepsChain.in).toHaveBeenCalledWith('id', ['step-old'])

    // Verify upsert of steps
    expect(upsertStepsChain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'step-1', workflow_id: 'wf-1' }),
        expect.objectContaining({ id: 'step-2', workflow_id: 'wf-1' }),
      ]),
      { onConflict: 'id' }
    )

    // Verify edges deleted then inserted
    expect(deleteEdgesChain.delete).toHaveBeenCalled()
    expect(deleteEdgesChain.eq).toHaveBeenCalledWith('workflow_id', 'wf-1')
    expect(insertEdgesChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          workflow_id: 'wf-1',
          source_step_id: 'step-1',
          target_step_id: 'step-2',
        }),
      ])
    )

    // Verify trigger_type sync
    expect(syncTriggerChain.update).toHaveBeenCalledWith({ trigger_type: 'survey_submitted' })
    expect(syncTriggerChain.eq).toHaveBeenCalledWith('id', 'wf-1')

    // Verify revalidation
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1/editor')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')
  })

  it('skips delete when no steps were removed', async () => {
    const dataNoRemovals = {
      steps: [
        { id: 'step-1', step_type: 'manual', step_config: {}, position_x: 0, position_y: 0 },
      ],
      edges: [],
    }

    ;(saveCanvasSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: dataNoRemovals,
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    // Chain 1: fetch existing — only step-1 (same as incoming)
    const fetchStepsChain = mockChain(undefined)
    fetchStepsChain.then = (resolve: any) =>
      Promise.resolve({ data: [{ id: 'step-1' }], error: null }).then(resolve)

    // Chain 2: upsert steps (skip delete since nothing removed)
    const upsertStepsChain = mockChain(undefined)
    upsertStepsChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 3: delete all edges
    const deleteEdgesChain = mockChain(undefined)
    deleteEdgesChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 4: sync trigger_type (manual is a trigger type)
    const syncTriggerChain = mockChain(undefined)
    syncTriggerChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    setupSequentialFrom(
      auth._supabase,
      fetchStepsChain,
      upsertStepsChain,
      deleteEdgesChain,
      syncTriggerChain
    )

    const result = await saveWorkflowCanvas('wf-1', dataNoRemovals as any)

    expect(result.success).toBe(true)
    // from() called 4 times (no delete step call)
    expect(auth._supabase.from).toHaveBeenCalledTimes(4)
  })
})

// =========================================================================
// triggerManualWorkflow
// =========================================================================

describe('triggerManualWorkflow', () => {
  it('returns auth error when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await triggerManualWorkflow('wf-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when workflow not found', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({ data: null, error: null })
    auth._supabase.from = vi.fn(() => fetchChain)

    const result = await triggerManualWorkflow('wf-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Workflow not found')
  })

  it('returns error when workflow belongs to different tenant', async () => {
    const auth = mockAuthSuccess({ tenantId: 'tenant-1' })
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: { id: 'wf-1', tenant_id: 'other-tenant', trigger_type: 'manual' },
      error: null,
    })
    auth._supabase.from = vi.fn(() => fetchChain)

    const result = await triggerManualWorkflow('wf-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Workflow not found')
  })

  it('rejects non-manual trigger type', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: { id: 'wf-1', tenant_id: 'tenant-1', trigger_type: 'survey_submitted' },
      error: null,
    })
    auth._supabase.from = vi.fn(() => fetchChain)

    const result = await triggerManualWorkflow('wf-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not a manual trigger')
  })

  it('executes workflow and returns executionId on success', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: { id: 'wf-1', tenant_id: 'tenant-1', trigger_type: 'manual' },
      error: null,
    })
    auth._supabase.from = vi.fn(() => fetchChain)

    mockExecuteWorkflow.mockResolvedValue({ executionId: 'exec-1' })

    const result = await triggerManualWorkflow('wf-1')

    expect(result.success).toBe(true)
    expect(result.executionId).toBe('exec-1')
    expect(mockExecuteWorkflow).toHaveBeenCalledWith('wf-1', { trigger_type: 'manual' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1/executions')
  })
})

// =========================================================================
// createWorkflowFromTemplate
// =========================================================================

describe('createWorkflowFromTemplate', () => {
  it('returns validation error for invalid data', async () => {
    ;(createWorkflowFromTemplateSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: false,
      error: { errors: [{ message: 'Invalid template ID' }] },
    })

    const result = await createWorkflowFromTemplate('')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid template ID')
  })

  it('returns error when template not found', async () => {
    ;(createWorkflowFromTemplateSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { templateId: 'non-existent' },
    })

    const result = await createWorkflowFromTemplate('non-existent')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Template not found')
  })

  it('returns auth error when not authenticated', async () => {
    ;(createWorkflowFromTemplateSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { templateId: 'tpl-1' },
    })
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await createWorkflowFromTemplate('tpl-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('creates workflow with remapped UUIDs for steps and edges', async () => {
    ;(createWorkflowFromTemplateSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { templateId: 'tpl-1' },
    })

    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    // Mock crypto.randomUUID for deterministic IDs
    let uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`
    )

    // Chain 1: insert workflow row
    const insertWorkflowChain = mockChain({ data: { id: 'wf-new' }, error: null })
    // Chain 2: insert steps
    const insertStepsChain = mockChain(undefined)
    insertStepsChain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve)
    // Chain 3: insert edges
    const insertEdgesChain = mockChain(undefined)
    insertEdgesChain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve)

    setupSequentialFrom(auth._supabase, insertWorkflowChain, insertStepsChain, insertEdgesChain)

    const result = await createWorkflowFromTemplate('tpl-1')

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 'wf-new' })

    // Verify workflow insert
    expect(insertWorkflowChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        name: 'Test Template',
        trigger_type: 'survey_submitted',
        is_active: false,
      })
    )

    // Verify steps with remapped UUIDs
    expect(insertStepsChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'uuid-1', workflow_id: 'wf-new', step_type: 'survey_submitted' }),
      expect.objectContaining({ id: 'uuid-2', workflow_id: 'wf-new', step_type: 'send_email' }),
    ])

    // Verify edges with remapped source/target
    expect(insertEdgesChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        workflow_id: 'wf-new',
        source_step_id: 'uuid-1',
        target_step_id: 'uuid-2',
      }),
    ])

    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows')

    vi.restoreAllMocks()
  })
})

// =========================================================================
// cancelWorkflowExecution
// =========================================================================

describe('cancelWorkflowExecution', () => {
  it('returns auth error when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthFailure())

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when execution not found', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({ data: null, error: null })
    setupServiceFrom(fetchChain)

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Execution not found')
  })

  it('returns error when execution belongs to different tenant', async () => {
    const auth = mockAuthSuccess({ tenantId: 'tenant-1' })
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: {
        id: 'exec-1',
        workflow_id: 'wf-1',
        tenant_id: 'other-tenant',
        status: 'running',
      },
      error: null,
    })
    setupServiceFrom(fetchChain)

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Execution not found')
  })

  it('rejects cancellation of already completed execution', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: {
        id: 'exec-1',
        workflow_id: 'wf-1',
        tenant_id: 'tenant-1',
        status: 'completed',
      },
      error: null,
    })
    setupServiceFrom(fetchChain)

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Can only cancel running executions')
  })

  it('cancels running execution and pending steps', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    // Chain 1: fetch execution
    const fetchChain = mockChain({
      data: {
        id: 'exec-1',
        workflow_id: 'wf-1',
        tenant_id: 'tenant-1',
        status: 'running',
      },
      error: null,
    })

    // Chain 2: update execution status
    const updateExecChain = mockChain(undefined)
    updateExecChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    // Chain 3: update step executions
    const updateStepsChain = mockChain(undefined)
    updateStepsChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    setupServiceFrom(fetchChain, updateExecChain, updateStepsChain)

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(true)

    // Verify execution update
    expect(updateExecChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )
    expect(updateExecChain.eq).toHaveBeenCalledWith('id', 'exec-1')

    // Verify step executions update
    expect(updateStepsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )
    expect(updateStepsChain.eq).toHaveBeenCalledWith('execution_id', 'exec-1')
    expect(updateStepsChain.in).toHaveBeenCalledWith('status', ['pending', 'running'])

    // Verify revalidation
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/workflows/wf-1/executions')
  })

  it('cancels pending execution too (not just running)', async () => {
    const auth = mockAuthSuccess()
    mockRequireAuth.mockResolvedValue(auth)

    const fetchChain = mockChain({
      data: {
        id: 'exec-1',
        workflow_id: 'wf-1',
        tenant_id: 'tenant-1',
        status: 'pending',
      },
      error: null,
    })

    const updateExecChain = mockChain(undefined)
    updateExecChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    const updateStepsChain = mockChain(undefined)
    updateStepsChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve)

    setupServiceFrom(fetchChain, updateExecChain, updateStepsChain)

    const result = await cancelWorkflowExecution('exec-1')

    expect(result.success).toBe(true)
  })
})
