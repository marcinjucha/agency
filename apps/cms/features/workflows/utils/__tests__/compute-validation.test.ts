import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock validateAllSteps — focused on the wrapper's selectedNode-override
// behaviour (which is the only non-trivial logic). validateAllSteps itself
// is exercised via Zod schemas, no value in re-running its branches here.
vi.mock('../validate-steps', () => ({
  validateAllSteps: vi.fn(() => ({ isValid: true, errors: [], errorsByStepId: new Map() })),
}))

import { computeValidation } from '../compute-validation'
import { validateAllSteps } from '../validate-steps'
import type { WorkflowCanvasHandle } from '../../components/WorkflowCanvas'

const mockedValidate = vi.mocked(validateAllSteps)

function makeCanvas(
  nodes: Array<{ id: string; data: Record<string, unknown> }> = [],
): WorkflowCanvasHandle {
  return {
    getNodes: () => nodes.map((n) => ({ id: n.id, type: 'send_email', position: { x: 0, y: 0 }, data: n.data })),
    getEdges: () => [],
    resetDirty: vi.fn(),
    updateNodeData: vi.fn(),
    removeEdgesForHandle: vi.fn(),
  }
}

beforeEach(() => {
  mockedValidate.mockClear()
})

describe('computeValidation', () => {
  it('returns valid empty result when canvas is null (canvas not yet mounted)', () => {
    const result = computeValidation(null, null)

    expect(result).toEqual({ isValid: true, errors: [], errorsByStepId: new Map() })
    expect(mockedValidate).not.toHaveBeenCalled()
  })

  it('passes canvas-derived steps to validateAllSteps when no node is selected', () => {
    const canvas = makeCanvas([
      { id: 'a', data: { stepType: 'send_email', stepConfig: { to: 'x@y' } } },
      { id: 'b', data: { stepType: 'condition', stepConfig: { expression: 'x > 0' } } },
    ])

    computeValidation(canvas, null)

    expect(mockedValidate).toHaveBeenCalledTimes(1)
    expect(mockedValidate.mock.calls[0][0]).toEqual([
      { id: 'a', step_type: 'send_email', step_config: { to: 'x@y' } },
      { id: 'b', step_type: 'condition', step_config: { expression: 'x > 0' } },
    ])
  })

  it('overrides selected node config with selectedNode state (in-memory edit takes precedence over canvas)', () => {
    const canvas = makeCanvas([
      { id: 'a', data: { stepType: 'send_email', stepConfig: { to: 'old@stale' } } },
    ])
    const selectedNode = {
      id: 'a',
      stepType: 'send_email',
      stepConfig: { to: 'new@fresh' },
    }

    computeValidation(canvas, selectedNode)

    const passedSteps = mockedValidate.mock.calls[0][0]
    expect(passedSteps[0].step_config).toEqual({ to: 'new@fresh' })
    expect(passedSteps[0].step_type).toBe('send_email')
  })

  it('does NOT override non-selected nodes — only the selected one swaps to in-memory state', () => {
    const canvas = makeCanvas([
      { id: 'a', data: { stepType: 'send_email', stepConfig: { to: 'a@x' } } },
      { id: 'b', data: { stepType: 'webhook', stepConfig: { url: 'https://b' } } },
    ])
    const selectedNode = {
      id: 'a',
      stepType: 'send_email',
      stepConfig: { to: 'a@new' },
    }

    computeValidation(canvas, selectedNode)

    const passedSteps = mockedValidate.mock.calls[0][0]
    expect(passedSteps[0].step_config).toEqual({ to: 'a@new' })
    expect(passedSteps[1].step_config).toEqual({ url: 'https://b' })
  })

  it('falls back to {} when canvas node has no stepConfig in data', () => {
    const canvas = makeCanvas([
      { id: 'a', data: { stepType: 'send_email' } }, // no stepConfig key
    ])

    computeValidation(canvas, null)

    expect(mockedValidate.mock.calls[0][0][0].step_config).toEqual({})
  })
})
