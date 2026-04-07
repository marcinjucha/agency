import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'
import {
  getWorkflows,
  getWorkflow,
  getWorkflowExecutions,
  getEmailTemplatesForWorkflow,
  getSurveysForWorkflow,
  getAllExecutions,
  getExecutionWithSteps,
} from '../queries'

// Mock ../types to avoid messages.ts import chain (known vitest Proxy hang — memory.md)
vi.mock('../types', () => ({
  toWorkflow: (data: any) => data,
  toWorkflowListItem: (data: any) => data,
  toWorkflowStep: (data: any) => data,
  toWorkflowEdge: (data: any) => data,
  toWorkflowExecution: (data: any) => data,
  toExecutionWithWorkflow: (data: any) => data,
  toStepExecutionWithMeta: (data: any) => data,
}))

// createClient is already mocked in vitest.setup.ts — we override per test
const mockCreateClient = createClient as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

import { createSequentialClient } from '@/__tests__/utils/supabase-mocks'

/** Single-response convenience wrapper */
function createMockClient(response: { data: any; error: any }) {
  return createSequentialClient(response)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getWorkflows', () => {
  it('returns list ordered by updated_at', async () => {
    const items = [
      { id: 'wf-1', name: 'Flow A', updated_at: '2026-04-07' },
      { id: 'wf-2', name: 'Flow B', updated_at: '2026-04-06' },
    ]
    mockCreateClient.mockReturnValue(createMockClient({ data: items, error: null }))

    const result = await getWorkflows()

    expect(result).toEqual(items)
    const client = mockCreateClient.mock.results[0].value
    expect(client.from).toHaveBeenCalledWith('workflows')
  })

  it('returns empty array when no data', async () => {
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: null }))

    const result = await getWorkflows()

    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'RLS violation' }
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: dbError }))

    await expect(getWorkflows()).rejects.toEqual(dbError)
  })
})

describe('getWorkflow', () => {
  it('fetches workflow + steps + edges via 3 sequential .from() calls', async () => {
    const workflow = { id: 'wf-1', name: 'Test', trigger_type: 'manual' }
    const steps = [{ id: 's-1', step_type: 'condition' }]
    const edges = [{ id: 'e-1', source_step_id: 's-1', target_step_id: 's-2' }]

    const client = createSequentialClient(
      { data: workflow, error: null },   // workflows
      { data: steps, error: null },      // workflow_steps
      { data: edges, error: null },      // workflow_edges
    )
    mockCreateClient.mockReturnValue(client)

    const result = await getWorkflow('wf-1')

    expect(result).toEqual({ ...workflow, steps, edges })
    expect(client.from).toHaveBeenCalledTimes(3)
    expect(client.from).toHaveBeenNthCalledWith(1, 'workflows')
    expect(client.from).toHaveBeenNthCalledWith(2, 'workflow_steps')
    expect(client.from).toHaveBeenNthCalledWith(3, 'workflow_edges')
  })

  it('throws "Workflow not found" when workflow is null', async () => {
    const client = createSequentialClient(
      { data: null, error: null },
    )
    // getWorkflow uses .maybeSingle() for first call
    mockCreateClient.mockReturnValue(client)

    await expect(getWorkflow('nonexistent')).rejects.toThrow('Workflow not found')
  })

  it('throws on Supabase error from workflow query', async () => {
    const dbError = { message: 'timeout' }
    const client = createSequentialClient(
      { data: null, error: dbError },
    )
    mockCreateClient.mockReturnValue(client)

    await expect(getWorkflow('wf-1')).rejects.toEqual(dbError)
  })

  it('throws on Supabase error from steps query', async () => {
    const workflow = { id: 'wf-1', name: 'Test' }
    const stepsError = { message: 'steps table missing' }
    const client = createSequentialClient(
      { data: workflow, error: null },
      { data: null, error: stepsError },
    )
    mockCreateClient.mockReturnValue(client)

    await expect(getWorkflow('wf-1')).rejects.toEqual(stepsError)
  })

  it('throws on Supabase error from edges query', async () => {
    const workflow = { id: 'wf-1', name: 'Test' }
    const edgesError = { message: 'edges table missing' }
    const client = createSequentialClient(
      { data: workflow, error: null },
      { data: [], error: null },
      { data: null, error: edgesError },
    )
    mockCreateClient.mockReturnValue(client)

    await expect(getWorkflow('wf-1')).rejects.toEqual(edgesError)
  })
})

describe('getWorkflowExecutions', () => {
  it('returns paginated executions for workflow', async () => {
    const executions = [{ id: 'ex-1', status: 'completed' }]
    mockCreateClient.mockReturnValue(createMockClient({ data: executions, error: null }))

    const result = await getWorkflowExecutions('wf-1')

    expect(result).toEqual(executions)
  })

  it('uses default limit=50, offset=0', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getWorkflowExecutions('wf-1')

    // range(0, 49) = first 50 items
    const chain = client.from.mock.results[0].value
    expect(chain.range).toHaveBeenCalledWith(0, 49)
  })

  it('respects custom limit and offset', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getWorkflowExecutions('wf-1', { limit: 10, offset: 20 })

    const chain = client.from.mock.results[0].value
    expect(chain.range).toHaveBeenCalledWith(20, 29)
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'query failed' }
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: dbError }))

    await expect(getWorkflowExecutions('wf-1')).rejects.toEqual(dbError)
  })
})

describe('getEmailTemplatesForWorkflow', () => {
  it('returns lightweight template list', async () => {
    const templates = [
      { id: 't-1', type: 'form_confirmation', subject: 'Potwierdzenie' },
    ]
    mockCreateClient.mockReturnValue(createMockClient({ data: templates, error: null }))

    const result = await getEmailTemplatesForWorkflow()

    expect(result).toEqual(templates)
  })

  it('returns empty array on no data', async () => {
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: null }))

    const result = await getEmailTemplatesForWorkflow()

    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'access denied' }
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: dbError }))

    await expect(getEmailTemplatesForWorkflow()).rejects.toEqual(dbError)
  })
})

describe('getSurveysForWorkflow', () => {
  it('returns lightweight survey list', async () => {
    const surveys = [
      { id: 's-1', title: 'Ankieta A' },
      { id: 's-2', title: 'Ankieta B' },
    ]
    mockCreateClient.mockReturnValue(createMockClient({ data: surveys, error: null }))

    const result = await getSurveysForWorkflow()

    expect(result).toEqual(surveys)
  })

  it('returns empty array on no data', async () => {
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: null }))

    const result = await getSurveysForWorkflow()

    expect(result).toEqual([])
  })
})

describe('getAllExecutions', () => {
  it('returns all executions without filters', async () => {
    const executions = [{ id: 'ex-1', workflows: { name: 'Flow', trigger_type: 'manual' } }]
    mockCreateClient.mockReturnValue(createMockClient({ data: executions, error: null }))

    const result = await getAllExecutions()

    expect(result).toEqual(executions)
  })

  it('applies workflowId filter when provided', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getAllExecutions({ workflowId: 'wf-1' })

    const chain = client.from.mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('workflow_id', 'wf-1')
  })

  it('applies status filter when provided', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getAllExecutions({ status: 'failed' })

    const chain = client.from.mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('status', 'failed')
  })

  it('applies both filters simultaneously', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getAllExecutions({ workflowId: 'wf-1', status: 'completed' })

    const chain = client.from.mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('workflow_id', 'wf-1')
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed')
  })

  it('uses default pagination', async () => {
    const client = createMockClient({ data: [], error: null })
    mockCreateClient.mockReturnValue(client)

    await getAllExecutions()

    const chain = client.from.mock.results[0].value
    expect(chain.range).toHaveBeenCalledWith(0, 49)
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'timeout' }
    mockCreateClient.mockReturnValue(createMockClient({ data: null, error: dbError }))

    await expect(getAllExecutions()).rejects.toEqual(dbError)
  })
})

describe('getExecutionWithSteps', () => {
  it('returns execution with step breakdowns via 2 .from() calls', async () => {
    const execution = { id: 'ex-1', status: 'completed', workflows: { name: 'Flow', trigger_type: 'manual' } }
    const stepExecs = [
      { id: 'se-1', workflow_steps: { step_type: 'condition' } },
      { id: 'se-2', workflow_steps: { step_type: 'send_email' } },
    ]

    const client = createSequentialClient(
      { data: execution, error: null },
      { data: stepExecs, error: null },
    )
    mockCreateClient.mockReturnValue(client)

    const result = await getExecutionWithSteps('ex-1')

    expect(result).not.toBeNull()
    expect(result!.step_executions).toEqual(stepExecs)
    expect(client.from).toHaveBeenCalledTimes(2)
    expect(client.from).toHaveBeenNthCalledWith(1, 'workflow_executions')
    expect(client.from).toHaveBeenNthCalledWith(2, 'workflow_step_executions')
  })

  it('returns null when execution not found', async () => {
    const client = createSequentialClient(
      { data: null, error: null },
    )
    mockCreateClient.mockReturnValue(client)

    const result = await getExecutionWithSteps('nonexistent')

    expect(result).toBeNull()
  })

  it('throws on Supabase error from execution query', async () => {
    const dbError = { message: 'connection lost' }
    const client = createSequentialClient(
      { data: null, error: dbError },
    )
    mockCreateClient.mockReturnValue(client)

    await expect(getExecutionWithSteps('ex-1')).rejects.toEqual(dbError)
  })

  it('throws on Supabase error from step executions query', async () => {
    const execution = { id: 'ex-1', workflows: { name: 'Flow', trigger_type: 'manual' } }
    const stepsError = { message: 'permission denied' }
    const client = createSequentialClient(
      { data: execution, error: null },
      { data: null, error: stepsError },
    )
    mockCreateClient.mockReturnValue(client)

    await expect(getExecutionWithSteps('ex-1')).rejects.toEqual(stepsError)
  })
})
