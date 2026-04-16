import { describe, it, expect, vi } from 'vitest'
import { createServerClient } from '@/lib/supabase/server-start'
import {
  getWorkflowsServer,
  getWorkflowServer,
  getExecutionWithStepsServer,
} from '../queries.server'

// Mock ../types to avoid messages.ts import chain (known vitest Proxy hang — memory.md)
vi.mock('../types', () => ({
  toWorkflow: (data: any) => data,
  toWorkflowListItem: (data: any) => data,
  toWorkflowStep: (data: any) => data,
  toWorkflowEdge: (data: any) => data,
  toExecutionWithWorkflow: (data: any) => data,
  toStepExecutionWithMeta: (data: any) => data,
}))

// createClient is already mocked in vitest.setup.ts — override per test
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
// Tests — getWorkflowsServer
// ---------------------------------------------------------------------------

describe('getWorkflowsServer', () => {
  it('returns list of workflows', async () => {
    const items = [
      { id: 'wf-1', name: 'Flow A', updated_at: '2026-04-07' },
      { id: 'wf-2', name: 'Flow B', updated_at: '2026-04-06' },
    ]
    mockCreateClient.mockResolvedValue(createMockClient({ data: items, error: null }))

    const result = await getWorkflowsServer()

    expect(result).toEqual(items)
    const client = await mockCreateClient.mock.results[0].value
    expect(client.from).toHaveBeenCalledWith('workflows')
  })

  it('returns empty array when no data', async () => {
    mockCreateClient.mockResolvedValue(createMockClient({ data: null, error: null }))

    const result = await getWorkflowsServer()

    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'RLS violation' }
    mockCreateClient.mockResolvedValue(createMockClient({ data: null, error: dbError }))

    await expect(getWorkflowsServer()).rejects.toEqual(dbError)
  })
})

// ---------------------------------------------------------------------------
// Tests — getWorkflowServer
// ---------------------------------------------------------------------------

describe('getWorkflowServer', () => {
  it('fetches workflow + steps + edges via 3 sequential .from() calls', async () => {
    const workflow = { id: 'wf-1', name: 'Test', trigger_type: 'manual' }
    const steps = [{ id: 's-1', step_type: 'condition' }]
    const edges = [{ id: 'e-1', source_step_id: 's-1', target_step_id: 's-2' }]

    const client = createSequentialClient(
      { data: workflow, error: null },
      { data: steps, error: null },
      { data: edges, error: null },
    )
    mockCreateClient.mockResolvedValue(client)

    const result = await getWorkflowServer('wf-1')

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
    mockCreateClient.mockResolvedValue(client)

    await expect(getWorkflowServer('nonexistent')).rejects.toThrow('Workflow not found')
  })

  it('throws on workflow query error', async () => {
    const dbError = { message: 'timeout' }
    const client = createSequentialClient(
      { data: null, error: dbError },
    )
    mockCreateClient.mockResolvedValue(client)

    await expect(getWorkflowServer('wf-1')).rejects.toEqual(dbError)
  })

  it('throws on steps query error', async () => {
    const workflow = { id: 'wf-1', name: 'Test' }
    const stepsError = { message: 'steps table missing' }
    const client = createSequentialClient(
      { data: workflow, error: null },
      { data: null, error: stepsError },
    )
    mockCreateClient.mockResolvedValue(client)

    await expect(getWorkflowServer('wf-1')).rejects.toEqual(stepsError)
  })
})

// ---------------------------------------------------------------------------
// Tests — getExecutionWithStepsServer
// ---------------------------------------------------------------------------

describe('getExecutionWithStepsServer', () => {
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
    mockCreateClient.mockResolvedValue(client)

    const result = await getExecutionWithStepsServer('ex-1')

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
    mockCreateClient.mockResolvedValue(client)

    const result = await getExecutionWithStepsServer('nonexistent')

    expect(result).toBeNull()
  })

  it('throws on Supabase error', async () => {
    const dbError = { message: 'connection lost' }
    const client = createSequentialClient(
      { data: null, error: dbError },
    )
    mockCreateClient.mockResolvedValue(client)

    await expect(getExecutionWithStepsServer('ex-1')).rejects.toEqual(dbError)
  })
})
