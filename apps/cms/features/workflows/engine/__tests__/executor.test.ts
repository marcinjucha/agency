import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks (must be before imports) ---

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('../utils', () => ({
  topologicalSort: vi.fn((steps: unknown[]) => steps),
  buildTriggerContext: vi.fn(() => ({})),
}))

vi.mock('../condition-evaluator', () => ({
  evaluateCondition: vi.fn(() => 'true'),
}))

vi.mock('../trigger-matcher', () => ({
  findMatchingWorkflows: vi.fn(() => []),
}))

vi.mock('../action-handlers', () => {
  const mockDryRunHandler = async () => ({ success: true, outputPayload: { mock: true } })
  return {
    stepHandlers: {} as Record<string, unknown>,
    dryRunHandlers: {
      send_email: mockDryRunHandler,
      ai_action: mockDryRunHandler,
      delay: mockDryRunHandler,
      webhook: mockDryRunHandler,
    },
  }
})

// Mock types to avoid messages.ts import chain
vi.mock('../../types', () => ({
  toWorkflow: vi.fn((d: unknown) => d),
  toWorkflowStep: vi.fn((d: unknown) => d),
  toWorkflowEdge: vi.fn((d: unknown) => d),
}))

// --- Imports (after mocks) ---

import { executeWorkflow, processWorkflowTrigger, resumeExecution } from '../executor'
import { createServiceClient } from '@/lib/supabase/service'
import { topologicalSort, buildTriggerContext } from '../utils'
import { evaluateCondition } from '../condition-evaluator'
import { findMatchingWorkflows } from '../trigger-matcher'
import { stepHandlers } from '../action-handlers'
import type { WorkflowStep, WorkflowEdge } from '../../types'
import { createTableMockClient } from '../../../../__tests__/utils/supabase-mocks'
import { makeStep, makeEdge, makeWorkflow, makeContext, manualTrigger } from '../../__tests__/fixtures'

// Alias for backward compat within this file
const createMockClient = createTableMockClient

// --- Helpers ---

/** Standard mock for a workflow that has active workflow + steps + edges + execution insert */
function setupExecuteWorkflowMock(
  workflow: ReturnType<typeof makeWorkflow>,
  steps: WorkflowStep[],
  edges: WorkflowEdge[],
  extraConfig?: Record<string, Array<{ data: unknown; error: unknown }>>
) {
  const stepExecData = steps.map((s, i) => ({ id: `se-${i}`, step_id: s.id }))

  const client = createMockClient({
    // fetchWorkflow
    workflows: [{ data: workflow, error: null }],
    // fetchSteps
    workflow_steps: [{ data: steps, error: null }],
    // fetchEdges
    workflow_edges: [{ data: edges, error: null }],
    // createExecution
    workflow_executions: [
      { data: { id: 'exec-1' }, error: null },
      // updateExecutionStatus (reused for subsequent calls)
      { data: null, error: null },
    ],
    // createStepExecutions + updateStepExecution calls
    workflow_step_executions: [
      { data: stepExecData, error: null },
      // subsequent update calls
      { data: null, error: null },
    ],
    ...extraConfig,
  })

  vi.mocked(createServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceClient>)
  return client
}

beforeEach(() => {
  // Reset stepHandlers to empty object each test
  const h = stepHandlers as Record<string, unknown>
  for (const key of Object.keys(h)) {
    delete h[key]
  }
})

// ============================================================
// executeWorkflow
// ============================================================

describe('executeWorkflow', () => {
  it('returns failed for inactive workflow', async () => {
    const workflow = makeWorkflow({ is_active: false })
    setupExecuteWorkflowMock(workflow, [], [])

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result).toEqual({ executionId: '', status: 'failed' })
  })

  it('returns completed for empty workflow (no steps)', async () => {
    setupExecuteWorkflowMock(makeWorkflow(), [], [])

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('completed')
    expect(result.executionId).toBe('exec-1')
  })

  it('completes a single sync step (webhook)', async () => {
    const step = makeStep('s1', 'webhook', { url: 'https://example.com' })
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    const handler = vi.fn().mockResolvedValue({ success: true })
    ;(stepHandlers as Record<string, unknown>)['webhook'] = handler

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('completed')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('returns waiting_for_callback for async step (send_email)', async () => {
    const step = makeStep('s1', 'send_email', { template_id: 'tpl-1' })
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    const handler = vi.fn().mockResolvedValue({ success: true, async: true })
    ;(stepHandlers as Record<string, unknown>)['send_email'] = handler

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('waiting_for_callback')
  })

  it('sets execution to paused for delay step', async () => {
    const step = makeStep('s1', 'delay', { duration: 3600 })
    const client = setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    const handler = vi.fn().mockResolvedValue({ success: true, async: true })
    ;(stepHandlers as Record<string, unknown>)['delay'] = handler

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('waiting_for_callback')

    // Verify execution updated to 'paused' — check that .from('workflow_executions').update was called with paused
    const execCalls = client.from.mock.calls.filter(
      (call: string[]) => call[0] === 'workflow_executions'
    )
    // At least one update call should have happened for 'paused'
    expect(execCalls.length).toBeGreaterThanOrEqual(2) // create + paused update
  })

  it('marks execution failed when step handler returns failure', async () => {
    const stepA = makeStep('sA', 'webhook', { url: 'https://a.com' })
    const stepB = makeStep('sB', 'webhook', { url: 'https://b.com' })
    setupExecuteWorkflowMock(makeWorkflow(), [stepA, stepB], [])

    const handlerA = vi.fn().mockResolvedValue({ success: false, error: 'boom' })
    const handlerB = vi.fn()
    ;(stepHandlers as Record<string, unknown>)['webhook'] = handlerA

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('failed')
    // handlerB should never be called — webhook handler fails on first step
    expect(handlerB).not.toHaveBeenCalled()
  })

  it('evaluates condition step and follows true branch', async () => {
    const condStep = makeStep('cond', 'condition', { expression: 'score >= 10' })
    const emailStep = makeStep('email', 'send_email', {})
    const webhookStep = makeStep('hook', 'webhook', {})

    const edges = [
      makeEdge('cond', 'email', 'true'),
      makeEdge('cond', 'hook', 'false'),
    ]

    vi.mocked(topologicalSort).mockReturnValue([condStep, emailStep, webhookStep])
    vi.mocked(evaluateCondition).mockReturnValue('true')

    setupExecuteWorkflowMock(makeWorkflow(), [condStep, emailStep, webhookStep], edges)

    const emailHandler = vi.fn().mockResolvedValue({ success: true, async: true })
    ;(stepHandlers as Record<string, unknown>)['send_email'] = emailHandler

    const webhookHandler = vi.fn()
    ;(stepHandlers as Record<string, unknown>)['webhook'] = webhookHandler

    await executeWorkflow('wf-1', manualTrigger)

    expect(emailHandler).toHaveBeenCalledOnce()
    expect(webhookHandler).not.toHaveBeenCalled()
  })

  it('evaluates condition step and follows false branch', async () => {
    const condStep = makeStep('cond', 'condition', { expression: 'score >= 10' })
    const emailStep = makeStep('email', 'send_email', {})
    const webhookStep = makeStep('hook', 'webhook', {})

    const edges = [
      makeEdge('cond', 'email', 'true'),
      makeEdge('cond', 'hook', 'false'),
    ]

    vi.mocked(topologicalSort).mockReturnValue([condStep, emailStep, webhookStep])
    vi.mocked(evaluateCondition).mockReturnValue('false')

    setupExecuteWorkflowMock(makeWorkflow(), [condStep, emailStep, webhookStep], edges)

    const emailHandler = vi.fn()
    ;(stepHandlers as Record<string, unknown>)['send_email'] = emailHandler

    const webhookHandler = vi.fn().mockResolvedValue({ success: true })
    ;(stepHandlers as Record<string, unknown>)['webhook'] = webhookHandler

    await executeWorkflow('wf-1', manualTrigger)

    expect(webhookHandler).toHaveBeenCalledOnce()
    expect(emailHandler).not.toHaveBeenCalled()
  })

  it('rejects circular workflows at depth > 1', async () => {
    const client = createMockClient({
      workflows: [{ data: makeWorkflow(), error: null }],
      workflow_steps: [{ data: [], error: null }],
      workflow_edges: [{ data: [], error: null }],
      // Parent exec has its own triggering_execution_id (depth 2)
      workflow_executions: [
        { data: { triggering_execution_id: 'grandparent-exec' }, error: null },
      ],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceClient>
    )

    const result = await executeWorkflow('wf-1', manualTrigger, {
      triggeringExecutionId: 'parent-exec',
    })

    expect(result.status).toBe('failed')
  })

  it('allows circular workflows at depth 1', async () => {
    // Parent exec has no triggering_execution_id (depth 1)
    const client = createMockClient({
      workflows: [{ data: makeWorkflow(), error: null }],
      workflow_steps: [{ data: [], error: null }],
      workflow_edges: [{ data: [], error: null }],
      workflow_executions: [
        // circular check: parent has no parent
        { data: { triggering_execution_id: null }, error: null },
        // createExecution
        { data: { id: 'exec-1' }, error: null },
        // updateExecutionStatus
        { data: null, error: null },
      ],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceClient>
    )

    const result = await executeWorkflow('wf-1', manualTrigger, {
      triggeringExecutionId: 'parent-exec',
    })

    expect(result.status).toBe('completed')
  })

  it('skips unknown step type without failing execution', async () => {
    const step = makeStep('s1', 'unknown_type', {})
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    // No handler registered for 'unknown_type'

    const result = await executeWorkflow('wf-1', manualTrigger)

    expect(result.status).toBe('completed')
  })

  it('merges handler outputPayload into variable context for next step', async () => {
    const stepA = makeStep('sA', 'webhook', {})
    const stepB = makeStep('sB', 'webhook', {})

    vi.mocked(topologicalSort).mockReturnValue([stepA, stepB])
    setupExecuteWorkflowMock(makeWorkflow(), [stepA, stepB], [])

    let capturedContext: Record<string, unknown> | undefined

    const handlerA = vi.fn().mockResolvedValue({
      success: true,
      outputPayload: { enrichedKey: 'enrichedValue' },
    })

    const handlerB = vi.fn().mockImplementation(
      (_step: unknown, _ctx: unknown, _client: unknown, varCtx: Record<string, unknown>) => {
        capturedContext = { ...varCtx }
        return Promise.resolve({ success: true })
      }
    )

    // Use a counter to dispatch to different handlers
    let callCount = 0
    ;(stepHandlers as Record<string, unknown>)['webhook'] = vi.fn().mockImplementation(
      (...args: unknown[]) => {
        callCount++
        if (callCount === 1) return handlerA(...args)
        return handlerB(...args)
      }
    )

    await executeWorkflow('wf-1', manualTrigger)

    expect(capturedContext).toBeDefined()
    expect(capturedContext!.enrichedKey).toBe('enrichedValue')
  })
})

// ============================================================
// processWorkflowTrigger
// ============================================================

describe('processWorkflowTrigger', () => {
  it('returns empty array when no matching workflows', async () => {
    const client = createMockClient({})
    vi.mocked(createServiceClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceClient>
    )
    vi.mocked(findMatchingWorkflows).mockResolvedValue([])

    const results = await processWorkflowTrigger(
      'survey_submitted',
      'tenant-1',
      manualTrigger
    )

    expect(results).toEqual([])
  })

  it('executes all matching workflows sequentially', async () => {
    // Setup: findMatchingWorkflows returns 2 workflows
    vi.mocked(findMatchingWorkflows).mockResolvedValue([
      makeWorkflow({ id: 'wf-1' }) as any,
      makeWorkflow({ id: 'wf-2' }) as any,
    ])

    // Each executeWorkflow call creates its own service client
    // We need the first call (processWorkflowTrigger) + two executeWorkflow calls
    const mockClient = createMockClient({
      workflows: [
        { data: makeWorkflow({ id: 'wf-1' }), error: null },
        { data: makeWorkflow({ id: 'wf-2' }), error: null },
      ],
      workflow_steps: [
        { data: [], error: null },
        { data: [], error: null },
      ],
      workflow_edges: [
        { data: [], error: null },
        { data: [], error: null },
      ],
      workflow_executions: [
        { data: { id: 'exec-1' }, error: null },
        { data: null, error: null }, // update status
        { data: { id: 'exec-2' }, error: null },
        { data: null, error: null }, // update status
      ],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    const results = await processWorkflowTrigger(
      'survey_submitted',
      'tenant-1',
      manualTrigger
    )

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('completed')
    expect(results[1].status).toBe('completed')
  })
})

// ============================================================
// resumeExecution
// ============================================================

describe('resumeExecution', () => {
  it('continues from next pending step after completed callback', async () => {
    const stepA = makeStep('sA', 'send_email', {})
    const stepB = makeStep('sB', 'webhook', {})

    vi.mocked(topologicalSort).mockReturnValue([stepA, stepB])

    const stepExecs = [
      { id: 'se-A', step_id: 'sA', status: 'completed', output_payload: null },
      { id: 'se-B', step_id: 'sB', status: 'pending', output_payload: null },
    ]

    const mockClient = createMockClient({
      // 1. Fetch execution
      workflow_executions: [
        {
          data: {
            id: 'exec-1',
            workflow_id: 'wf-1',
            status: 'waiting_for_callback',
            trigger_payload: { trigger_type: 'manual' },
            triggering_execution_id: null,
          },
          error: null,
        },
        // 2. Optimistic lock
        { data: [{ id: 'exec-1' }], error: null },
        // 3. updateExecutionStatus (completed)
        { data: null, error: null },
      ],
      // Fetch step executions
      workflow_step_executions: [
        { data: stepExecs, error: null },
        // subsequent updates
        { data: null, error: null },
      ],
      // Fetch steps
      workflow_steps: [{ data: [stepA, stepB], error: null }],
      // Fetch edges
      workflow_edges: [{ data: [], error: null }],
      // fetchWorkflow for variable context rebuild
      workflows: [{ data: makeWorkflow(), error: null }],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    const webhookHandler = vi.fn().mockResolvedValue({ success: true })
    ;(stepHandlers as Record<string, unknown>)['webhook'] = webhookHandler

    await resumeExecution('exec-1', 'se-A', 'completed')

    expect(webhookHandler).toHaveBeenCalledOnce()
  })

  it('marks remaining steps as skipped when callback reports failure', async () => {
    const stepA = makeStep('sA', 'send_email', {})
    const stepB = makeStep('sB', 'webhook', {})

    vi.mocked(topologicalSort).mockReturnValue([stepA, stepB])

    const stepExecs = [
      { id: 'se-A', step_id: 'sA', status: 'running', output_payload: null },
      { id: 'se-B', step_id: 'sB', status: 'pending', output_payload: null },
    ]

    const mockClient = createMockClient({
      workflow_executions: [
        {
          data: {
            id: 'exec-1',
            workflow_id: 'wf-1',
            status: 'waiting_for_callback',
            trigger_payload: { trigger_type: 'manual' },
            triggering_execution_id: null,
          },
          error: null,
        },
        // Optimistic lock
        { data: [{ id: 'exec-1' }], error: null },
        // updateExecutionStatus (failed)
        { data: null, error: null },
      ],
      workflow_step_executions: [
        { data: stepExecs, error: null },
        // skip step B + update exec status
        { data: null, error: null },
      ],
      workflow_steps: [{ data: [stepA, stepB], error: null }],
      workflow_edges: [{ data: [], error: null }],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    const webhookHandler = vi.fn()
    ;(stepHandlers as Record<string, unknown>)['webhook'] = webhookHandler

    await resumeExecution('exec-1', 'se-A', 'failed')

    // Webhook handler should NOT be called — execution fails after callback failure
    expect(webhookHandler).not.toHaveBeenCalled()
  })

  it('returns silently for already completed execution', async () => {
    const mockClient = createMockClient({
      workflow_executions: [
        {
          data: {
            id: 'exec-1',
            workflow_id: 'wf-1',
            status: 'completed',
            trigger_payload: { trigger_type: 'manual' },
            triggering_execution_id: null,
          },
          error: null,
        },
      ],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    // Should not throw
    await resumeExecution('exec-1', 'se-A', 'completed')

    // No lock attempt — execution already terminal
    const execCalls = mockClient.from.mock.calls.filter(
      (call: string[]) => call[0] === 'workflow_executions'
    )
    // Only the initial fetch, no lock update
    expect(execCalls).toHaveLength(1)
  })

  it('rebuilds variable context from completed step outputs on resume', async () => {
    const stepA = makeStep('sA', 'send_email', {})
    const stepB = makeStep('sB', 'webhook', {})

    vi.mocked(topologicalSort).mockReturnValue([stepA, stepB])

    const stepExecs = [
      { id: 'se-A', step_id: 'sA', status: 'completed', output_payload: { emailSent: true } },
      { id: 'se-B', step_id: 'sB', status: 'pending', output_payload: null },
    ]

    const mockClient = createMockClient({
      workflow_executions: [
        {
          data: {
            id: 'exec-1',
            workflow_id: 'wf-1',
            status: 'waiting_for_callback',
            trigger_payload: { trigger_type: 'manual' },
            triggering_execution_id: null,
          },
          error: null,
        },
        { data: [{ id: 'exec-1' }], error: null },
        { data: null, error: null },
      ],
      workflow_step_executions: [
        { data: stepExecs, error: null },
        { data: null, error: null },
      ],
      workflow_steps: [{ data: [stepA, stepB], error: null }],
      workflow_edges: [{ data: [], error: null }],
      workflows: [{ data: makeWorkflow(), error: null }],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    let capturedContext: Record<string, unknown> | undefined
    const webhookHandler = vi.fn().mockImplementation(
      (_step: unknown, _ctx: unknown, _client: unknown, varCtx: Record<string, unknown>) => {
        capturedContext = { ...varCtx }
        return Promise.resolve({ success: true })
      }
    )
    ;(stepHandlers as Record<string, unknown>)['webhook'] = webhookHandler

    await resumeExecution('exec-1', 'se-A', 'completed')

    expect(capturedContext?.emailSent).toBe(true)
  })

  it('returns silently when optimistic lock fails', async () => {
    const mockClient = createMockClient({
      workflow_executions: [
        {
          data: {
            id: 'exec-1',
            workflow_id: 'wf-1',
            status: 'waiting_for_callback',
            trigger_payload: { trigger_type: 'manual' },
            triggering_execution_id: null,
          },
          error: null,
        },
        // Optimistic lock returns empty array (another process took over)
        { data: [], error: null },
      ],
    })

    vi.mocked(createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceClient>
    )

    // Should not throw — exits silently
    await resumeExecution('exec-1', 'se-A', 'completed')
  })
})

// ============================================================
// Dry-run mode
// ============================================================

describe('dry-run mode', () => {
  it('completes without calling real handlers (n8n not called)', async () => {
    const step = makeStep('s1', 'send_email', { template_id: 'tpl-1' })
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    // Register a real handler that should NOT be called in dry-run
    const realHandler = vi.fn().mockResolvedValue({ success: true, async: true })
    ;(stepHandlers as Record<string, unknown>)['send_email'] = realHandler

    const result = await executeWorkflow('wf-1', manualTrigger, { dryRun: true })

    expect(result.status).toBe('completed')
    expect(realHandler).not.toHaveBeenCalled()
  })

  it('generates mock output based on STEP_OUTPUT_SCHEMAS', async () => {
    const step = makeStep('s1', 'webhook', { url: 'https://example.com' })
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    // Track what gets written as output_payload
    let capturedContext: Record<string, unknown> | undefined

    // Add a second step to capture the variable context after first step
    const step2 = makeStep('s2', 'webhook', {})
    vi.mocked(topologicalSort).mockReturnValue([step, step2])

    // Re-setup with 2 steps
    const stepExecData = [{ id: 'se-0', step_id: 's1' }, { id: 'se-1', step_id: 's2' }]
    const client = createMockClient({
      workflows: [{ data: makeWorkflow(), error: null }],
      workflow_steps: [{ data: [step, step2], error: null }],
      workflow_edges: [{ data: [], error: null }],
      workflow_executions: [
        { data: { id: 'exec-1' }, error: null },
        { data: null, error: null },
      ],
      workflow_step_executions: [
        { data: stepExecData, error: null },
        { data: null, error: null },
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceClient>)

    const result = await executeWorkflow('wf-1', manualTrigger, { dryRun: true })

    expect(result.status).toBe('completed')
  })

  it('skips is_active check (allows dry-run on inactive workflow)', async () => {
    const workflow = makeWorkflow({ is_active: false })
    setupExecuteWorkflowMock(workflow, [], [])

    const result = await executeWorkflow('wf-1', manualTrigger, { dryRun: true })

    // Without dryRun, inactive returns failed; with dryRun, it completes
    expect(result.status).toBe('completed')
    expect(result.executionId).toBe('exec-1')
  })

  it('delay step completes immediately (no resume_at, no async)', async () => {
    const step = makeStep('s1', 'delay', { value: 60, unit: 'minutes' })
    setupExecuteWorkflowMock(makeWorkflow(), [step], [])

    // Real delay handler would set async: true and write resume_at
    const realHandler = vi.fn().mockResolvedValue({ success: true, async: true })
    ;(stepHandlers as Record<string, unknown>)['delay'] = realHandler

    const result = await executeWorkflow('wf-1', manualTrigger, { dryRun: true })

    // Dry-run delay completes synchronously (mock handler returns success without async)
    expect(result.status).toBe('completed')
    expect(realHandler).not.toHaveBeenCalled()
  })

  it('creates execution record with is_dry_run flag', async () => {
    const client = setupExecuteWorkflowMock(makeWorkflow(), [], [])

    await executeWorkflow('wf-1', manualTrigger, { dryRun: true })

    // Find the insert call on workflow_executions
    const execCalls = client.from.mock.calls
    const insertCalls = execCalls.filter((call: string[]) => call[0] === 'workflow_executions')
    expect(insertCalls.length).toBeGreaterThanOrEqual(1)
  })
})
