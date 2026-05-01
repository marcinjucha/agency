/**
 * Tests for query handlers in handlers.server.ts.
 *
 * Targets pure handlers (e.g. getWorkflowsHandler) so we don't drive the
 * createServerFn RPC pipeline. Same pattern as docforge-licenses tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockChain, createSequentialClient } from '@/__tests__/utils/supabase-mocks'

// Mock ../types to avoid messages.ts import chain (known vitest Proxy hang — memory.md)
vi.mock('../types', () => ({
  toWorkflow: (data: any) => data,
  toWorkflowListItem: (data: any) => data,
  toWorkflowStep: (data: any) => data,
  toWorkflowEdge: (data: any) => data,
  toWorkflowExecution: (data: any) => data,
  toExecutionWithWorkflow: (data: any) => data,
  toStepExecutionWithMeta: (data: any) => data,
  parseWorkflowSnapshot: () => null,
}))

const mockServerClient: Record<string, any> = {}

vi.mock('@/lib/supabase/server-start.server', () => ({
  createServerClient: vi.fn(() => mockServerClient),
}))

import {
  getWorkflowsHandler,
  getWorkflowHandler,
  getWorkflowsForSelectorHandler,
  getWorkflowExecutionsHandler,
  getEmailTemplatesForWorkflowHandler,
  getEmailTemplatesWithBodyHandler,
  getSurveysForWorkflowHandler,
  getAllExecutionsHandler,
  getExecutionWithStepsHandler,
} from '../handlers.server'

// --- Helpers ---

function setupServerSequential(...responses: Array<{ data: any; error: any }>) {
  const client = createSequentialClient(...responses)
  mockServerClient.from = client.from
}

function setupServerChain(response: { data: any; error: any }) {
  const chain = mockChain(response)
  // override `then` so any terminal `.order()/.eq()` await resolves to response
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(response).then(resolve, reject)
  mockServerClient.from = vi.fn(() => chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =========================================================================
// getWorkflowsHandler
// =========================================================================

describe('getWorkflowsHandler', () => {
  it('returns list ordered by updated_at', async () => {
    const items = [
      { id: 'wf-1', name: 'Flow A' },
      { id: 'wf-2', name: 'Flow B' },
    ]
    setupServerChain({ data: items, error: null })

    const result = await getWorkflowsHandler()

    expect(result).toEqual(items)
    expect(mockServerClient.from).toHaveBeenCalledWith('workflows')
  })

  it('returns empty array when no data', async () => {
    setupServerChain({ data: null, error: null })

    const result = await getWorkflowsHandler()

    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'RLS violation' }
    setupServerChain({ data: null, error: dbError })

    await expect(getWorkflowsHandler()).rejects.toEqual(dbError)
  })
})

// =========================================================================
// getWorkflowsForSelectorHandler
// =========================================================================

describe('getWorkflowsForSelectorHandler', () => {
  it('returns active workflows of given trigger type', async () => {
    const items = [{ id: 'wf-1', name: 'Active' }]
    setupServerChain({ data: items, error: null })

    const result = await getWorkflowsForSelectorHandler('survey_submitted')

    expect(result).toEqual(items)
  })

  it('defaults trigger type to survey_submitted', async () => {
    const chain = setupServerChain({ data: [], error: null })

    await getWorkflowsForSelectorHandler()

    expect(chain.eq).toHaveBeenCalledWith('trigger_type', 'survey_submitted')
  })

  it('throws on Supabase error', async () => {
    setupServerChain({ data: null, error: { message: 'fail' } })

    await expect(getWorkflowsForSelectorHandler()).rejects.toEqual({ message: 'fail' })
  })
})

// =========================================================================
// getWorkflowHandler
// =========================================================================

describe('getWorkflowHandler', () => {
  it('fetches workflow + steps + edges via 3 sequential .from() calls', async () => {
    const workflow = { id: 'wf-1', name: 'Test', trigger_type: 'manual' }
    const steps = [{ id: 's-1', step_type: 'condition' }]
    const edges = [{ id: 'e-1' }]

    setupServerSequential(
      { data: workflow, error: null },
      { data: steps, error: null },
      { data: edges, error: null },
    )

    const result = await getWorkflowHandler('wf-1')

    expect(result).toEqual({ ...workflow, steps, edges })
    expect(mockServerClient.from).toHaveBeenCalledTimes(3)
    expect(mockServerClient.from).toHaveBeenNthCalledWith(1, 'workflows')
    expect(mockServerClient.from).toHaveBeenNthCalledWith(2, 'workflow_steps')
    expect(mockServerClient.from).toHaveBeenNthCalledWith(3, 'workflow_edges')
  })

  it('throws when workflow is null', async () => {
    setupServerSequential({ data: null, error: null })

    await expect(getWorkflowHandler('nonexistent')).rejects.toThrow()
  })

  it('throws on workflow query error', async () => {
    const dbError = { message: 'timeout' }
    setupServerSequential({ data: null, error: dbError })

    await expect(getWorkflowHandler('wf-1')).rejects.toEqual(dbError)
  })
})

// =========================================================================
// getWorkflowExecutionsHandler
// =========================================================================

describe('getWorkflowExecutionsHandler', () => {
  it('returns paginated executions', async () => {
    const executions = [{ id: 'ex-1' }]
    setupServerChain({ data: executions, error: null })

    const result = await getWorkflowExecutionsHandler('wf-1')

    expect(result).toEqual(executions)
  })

  it('respects custom limit/offset', async () => {
    const chain = setupServerChain({ data: [], error: null })

    await getWorkflowExecutionsHandler('wf-1', { limit: 10, offset: 20 })

    expect(chain.range).toHaveBeenCalledWith(20, 29)
  })

  it('throws on Supabase error', async () => {
    setupServerChain({ data: null, error: { message: 'fail' } })

    await expect(getWorkflowExecutionsHandler('wf-1')).rejects.toEqual({ message: 'fail' })
  })
})

// =========================================================================
// getEmailTemplatesForWorkflowHandler
// =========================================================================

describe('getEmailTemplatesForWorkflowHandler', () => {
  it('returns lightweight template list', async () => {
    const templates = [{ id: 't-1', type: 'form_confirmation', subject: 'Sub' }]
    setupServerChain({ data: templates, error: null })

    const result = await getEmailTemplatesForWorkflowHandler()

    expect(result).toEqual(templates)
  })

  it('throws on Supabase error', async () => {
    setupServerChain({ data: null, error: { message: 'denied' } })

    await expect(getEmailTemplatesForWorkflowHandler()).rejects.toEqual({ message: 'denied' })
  })
})

describe('getEmailTemplatesWithBodyHandler', () => {
  it('maps html_body field with default empty string', async () => {
    const templates = [
      { id: 't-1', type: 'form_confirmation', subject: 'Sub', html_body: '<p>Hi</p>' },
      { id: 't-2', type: 'workflow_custom', subject: 'X', html_body: null },
    ]
    setupServerChain({ data: templates, error: null })

    const result = await getEmailTemplatesWithBodyHandler()

    expect(result[0].html_body).toBe('<p>Hi</p>')
    expect(result[1].html_body).toBe('')
  })
})

// =========================================================================
// getSurveysForWorkflowHandler
// =========================================================================

describe('getSurveysForWorkflowHandler', () => {
  it('returns lightweight survey list', async () => {
    const surveys = [{ id: 's-1', title: 'Survey A' }]
    setupServerChain({ data: surveys, error: null })

    const result = await getSurveysForWorkflowHandler()

    expect(result).toEqual(surveys)
  })

  it('returns empty array on no data', async () => {
    setupServerChain({ data: null, error: null })

    const result = await getSurveysForWorkflowHandler()

    expect(result).toEqual([])
  })
})

// =========================================================================
// getAllExecutionsHandler
// =========================================================================

describe('getAllExecutionsHandler', () => {
  it('returns all executions when no filters', async () => {
    const executions = [{ id: 'ex-1' }]
    setupServerChain({ data: executions, error: null })

    const result = await getAllExecutionsHandler()

    expect(result).toEqual(executions)
  })

  it('applies workflowId filter', async () => {
    const chain = setupServerChain({ data: [], error: null })

    await getAllExecutionsHandler({ workflowId: 'wf-1' })

    expect(chain.eq).toHaveBeenCalledWith('workflow_id', 'wf-1')
  })

  it('applies status filter', async () => {
    const chain = setupServerChain({ data: [], error: null })

    await getAllExecutionsHandler({ status: 'failed' })

    expect(chain.eq).toHaveBeenCalledWith('status', 'failed')
  })

  it('throws on Supabase error', async () => {
    setupServerChain({ data: null, error: { message: 'fail' } })

    await expect(getAllExecutionsHandler()).rejects.toEqual({ message: 'fail' })
  })
})

// =========================================================================
// getExecutionWithStepsHandler
// =========================================================================

describe('getExecutionWithStepsHandler', () => {
  it('returns execution with step breakdowns via 2 .from() calls', async () => {
    const execution = { id: 'ex-1', status: 'completed', workflow_snapshot: null }
    const stepExecs = [{ id: 'se-1' }]

    setupServerSequential(
      { data: execution, error: null },
      { data: stepExecs, error: null },
    )

    const result = await getExecutionWithStepsHandler('ex-1')

    expect(result).not.toBeNull()
    expect(result!.step_executions).toEqual(stepExecs)
    expect(mockServerClient.from).toHaveBeenCalledTimes(2)
    expect(mockServerClient.from).toHaveBeenNthCalledWith(1, 'workflow_executions')
    expect(mockServerClient.from).toHaveBeenNthCalledWith(2, 'workflow_step_executions')
  })

  it('returns null when execution not found', async () => {
    setupServerSequential({ data: null, error: null })

    const result = await getExecutionWithStepsHandler('nope')

    expect(result).toBeNull()
  })

  it('throws on Supabase error', async () => {
    setupServerSequential({ data: null, error: { message: 'fail' } })

    await expect(getExecutionWithStepsHandler('ex-1')).rejects.toEqual({ message: 'fail' })
  })
})
