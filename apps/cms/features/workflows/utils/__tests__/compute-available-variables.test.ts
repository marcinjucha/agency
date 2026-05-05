import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the engine util — keep tests focused on the wrapper's defensive guards
// and argument forwarding, not on collectAvailableVariables internals (those
// have their own tests in engine/__tests__/utils.test.ts).
vi.mock('../../engine/utils', () => ({
  collectAvailableVariables: vi.fn(() => []),
}))

import { computeAvailableVariables } from '../compute-available-variables'
import { collectAvailableVariables } from '../../engine/utils'
import type { WorkflowCanvasHandle } from '../../components/WorkflowCanvas'

const mockedCollect = vi.mocked(collectAvailableVariables)

function makeCanvas(
  nodes: Array<{ id: string; data: Record<string, unknown> }> = [],
  edges: Array<{ source: string; target: string }> = [],
): WorkflowCanvasHandle {
  return {
    getNodes: () => nodes.map((n) => ({ id: n.id, type: 'send_email', position: { x: 0, y: 0 }, data: n.data })),
    getEdges: () => edges.map((e, i) => ({ id: `e-${i}`, source: e.source, target: e.target })),
    resetDirty: vi.fn(),
    updateNodeData: vi.fn(),
    removeEdgesForHandle: vi.fn(),
  }
}

beforeEach(() => {
  mockedCollect.mockClear()
})

describe('computeAvailableVariables', () => {
  it('returns [] when selectedNode is null (no node selected → no variables panel)', () => {
    const canvas = makeCanvas()
    const result = computeAvailableVariables(null, canvas, 'manual')

    expect(result).toEqual([])
    expect(mockedCollect).not.toHaveBeenCalled()
  })

  it('returns [] when canvas is null (lazy-loaded canvas not yet attached)', () => {
    const result = computeAvailableVariables(
      { id: 'step-1', stepType: 'send_email', stepConfig: {} },
      null,
      'manual',
    )

    expect(result).toEqual([])
    expect(mockedCollect).not.toHaveBeenCalled()
  })

  it('forwards selectedNode.id, normalized steps and edges to collectAvailableVariables', () => {
    const canvas = makeCanvas(
      [
        { id: 'step-a', data: { stepType: 'manual', stepConfig: { foo: 'bar' }, slug: 'trigger' } },
        { id: 'step-b', data: { stepType: 'send_email', stepConfig: { to: 'x@y' }, slug: 'sendEmail' } },
      ],
      [{ source: 'step-a', target: 'step-b' }],
    )
    computeAvailableVariables(
      { id: 'step-b', stepType: 'send_email', stepConfig: {} },
      canvas,
      'manual',
    )

    expect(mockedCollect).toHaveBeenCalledTimes(1)
    const [stepId, steps, edges, triggerType] = mockedCollect.mock.calls[0]
    expect(stepId).toBe('step-b')
    expect(steps).toEqual([
      { id: 'step-a', slug: 'trigger', step_type: 'manual', step_config: { foo: 'bar' } },
      { id: 'step-b', slug: 'sendEmail', step_type: 'send_email', step_config: { to: 'x@y' } },
    ])
    expect(edges).toEqual([{ source_step_id: 'step-a', target_step_id: 'step-b' }])
    expect(triggerType).toBe('manual')
  })

  it('falls back to node.id when slug is missing on data, empty config when absent', () => {
    const canvas = makeCanvas([
      { id: 'no-slug', data: { stepType: 'webhook' } }, // no slug, no stepConfig
    ])
    computeAvailableVariables(
      { id: 'no-slug', stepType: 'webhook', stepConfig: {} },
      canvas,
      'manual',
    )

    const [, steps] = mockedCollect.mock.calls[0]
    expect(steps[0].slug).toBe('no-slug')
    expect(steps[0].step_config).toEqual({})
  })
})
