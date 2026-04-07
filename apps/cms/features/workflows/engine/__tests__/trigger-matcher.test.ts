import { describe, it, expect, vi } from 'vitest'
import { findMatchingWorkflows } from '../trigger-matcher'

// Mock ../types to avoid messages.ts import chain (known vitest Proxy hang — memory.md)
vi.mock('../../types', () => ({
  toWorkflow: vi.fn((data: any) => data),
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockClient(finalValue: { data: any; error: any }) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  // Make chain thenable so await resolves to finalValue
  chain.then = (resolve: any) => Promise.resolve(finalValue).then(resolve)

  const from = vi.fn().mockReturnValue(chain)
  return { from, _chain: chain } as any
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findMatchingWorkflows', () => {
  it('returns active workflows matching trigger_type and tenant_id', async () => {
    const workflows = [
      { id: 'wf-1', trigger_type: 'survey_submitted', tenant_id: 't-1', is_active: true },
      { id: 'wf-2', trigger_type: 'survey_submitted', tenant_id: 't-1', is_active: true },
    ]
    const client = createMockClient({ data: workflows, error: null })

    const result = await findMatchingWorkflows('survey_submitted', 't-1', client)

    expect(result).toEqual(workflows)
    expect(client.from).toHaveBeenCalledWith('workflows')
    expect(client._chain.select).toHaveBeenCalledWith('*')
    expect(client._chain.eq).toHaveBeenCalledWith('tenant_id', 't-1')
    expect(client._chain.eq).toHaveBeenCalledWith('trigger_type', 'survey_submitted')
    expect(client._chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns empty array when no workflows match', async () => {
    const client = createMockClient({ data: [], error: null })

    const result = await findMatchingWorkflows('manual', 't-1', client)

    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await findMatchingWorkflows('manual', 't-1', client)

    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const client = createMockClient({
      data: null,
      error: { message: 'Connection refused' },
    })

    await expect(
      findMatchingWorkflows('survey_submitted', 't-1', client)
    ).rejects.toThrow('Failed to query matching workflows: Connection refused')
  })

  it('calls toWorkflow on each result row', async () => {
    const { toWorkflow } = await import('../../types')
    const mockToWorkflow = toWorkflow as ReturnType<typeof vi.fn>

    const rows = [{ id: 'wf-1' }, { id: 'wf-2' }, { id: 'wf-3' }]
    const client = createMockClient({ data: rows, error: null })

    await findMatchingWorkflows('lead_scored', 't-1', client)

    expect(mockToWorkflow).toHaveBeenCalledTimes(3)
    // .map() passes (element, index, array) — verify first arg of each call
    expect(mockToWorkflow.mock.calls[0][0]).toEqual({ id: 'wf-1' })
    expect(mockToWorkflow.mock.calls[1][0]).toEqual({ id: 'wf-2' })
    expect(mockToWorkflow.mock.calls[2][0]).toEqual({ id: 'wf-3' })
  })
})
