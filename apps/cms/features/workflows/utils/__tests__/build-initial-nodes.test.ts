import { describe, it, expect } from 'vitest'
import { buildInitialNodes, isTriggerType, getNodeType } from '../build-initial-nodes'
import type { WorkflowWithSteps, WorkflowStep } from '../../types'

const SYNTHETIC_ID = 'synthetic-trigger-id'

function makeStep(overrides: Partial<WorkflowStep> & { id: string; step_type: string }): WorkflowStep {
  return {
    id: overrides.id,
    workflow_id: 'wf-1',
    step_type: overrides.step_type,
    step_config: overrides.step_config ?? {},
    position_x: overrides.position_x ?? 100,
    position_y: overrides.position_y ?? 100,
    slug: overrides.slug ?? overrides.id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as WorkflowStep
}

function makeWorkflow(overrides: Partial<WorkflowWithSteps> = {}): WorkflowWithSteps {
  return {
    id: 'wf-1',
    tenant_id: 'tenant-1',
    name: 'Test Workflow',
    description: null,
    trigger_type: 'manual',
    trigger_config: { type: 'manual' },
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    steps: [],
    edges: [],
    ...overrides,
  } as WorkflowWithSteps
}

describe('isTriggerType', () => {
  it('returns true for known trigger types', () => {
    expect(isTriggerType('survey_submitted')).toBe(true)
    expect(isTriggerType('booking_created')).toBe(true)
    expect(isTriggerType('lead_scored')).toBe(true)
    expect(isTriggerType('manual')).toBe(true)
    expect(isTriggerType('scheduled')).toBe(true)
  })

  it('returns false for non-trigger step types', () => {
    expect(isTriggerType('send_email')).toBe(false)
    expect(isTriggerType('condition')).toBe(false)
    expect(isTriggerType('webhook')).toBe(false)
    expect(isTriggerType('unknown_type')).toBe(false)
  })
})

describe('getNodeType', () => {
  it('returns "trigger" for any trigger type (collapses all triggers to single node type)', () => {
    expect(getNodeType('survey_submitted')).toBe('trigger')
    expect(getNodeType('manual')).toBe('trigger')
  })

  it('returns step_type as-is for non-trigger steps', () => {
    expect(getNodeType('send_email')).toBe('send_email')
    expect(getNodeType('condition')).toBe('condition')
  })
})

describe('buildInitialNodes', () => {
  it('returns synthetic trigger only when workflow has no steps', () => {
    const workflow = makeWorkflow({ steps: [], trigger_type: 'manual' })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe(SYNTHETIC_ID)
    expect(nodes[0].type).toBe('trigger')
    expect(nodes[0].deletable).toBe(false)
    expect((nodes[0].data as { stepType: string }).stepType).toBe('manual')
    expect((nodes[0].data as { slug: string }).slug).toBe('trigger')
  })

  it('does NOT prepend synthetic trigger when workflow already contains a trigger step', () => {
    const workflow = makeWorkflow({
      trigger_type: 'survey_submitted',
      steps: [
        makeStep({ id: 'trig-1', step_type: 'survey_submitted' }),
        makeStep({ id: 'step-1', step_type: 'send_email' }),
      ],
    })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)

    expect(nodes).toHaveLength(2)
    expect(nodes.find((n) => n.id === SYNTHETIC_ID)).toBeUndefined()
    expect(nodes[0].id).toBe('trig-1')
    expect(nodes[0].type).toBe('trigger')
    expect(nodes[1].id).toBe('step-1')
    expect(nodes[1].type).toBe('send_email')
  })

  it('marks trigger nodes from DB as non-deletable, non-triggers as undeletable=undefined', () => {
    const workflow = makeWorkflow({
      steps: [
        makeStep({ id: 'trig-1', step_type: 'manual' }),
        makeStep({ id: 'step-1', step_type: 'send_email' }),
      ],
    })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)

    expect(nodes[0].deletable).toBe(false)
    expect(nodes[1].deletable).toBeUndefined()
  })

  it('uses step_config._name as label when present, falls back to step type label', () => {
    const workflow = makeWorkflow({
      steps: [
        makeStep({ id: 'step-1', step_type: 'send_email', step_config: { _name: 'Custom Label' } }),
        makeStep({ id: 'step-2', step_type: 'send_email', step_config: {} }),
      ],
    })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)

    // step-1 prepended by synthetic trigger so step-1 is at index 1
    expect((nodes[1].data as { label: string }).label).toBe('Custom Label')
    // step-2 falls back to step-type label (resolved via getLabel/messages)
    expect((nodes[2].data as { label: string }).label).not.toBe('Custom Label')
    expect(typeof (nodes[2].data as { label: string }).label).toBe('string')
  })

  it('preserves step position from DB row', () => {
    const workflow = makeWorkflow({
      steps: [
        makeStep({ id: 'step-1', step_type: 'send_email', position_x: 250, position_y: 400 }),
      ],
    })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)
    const step = nodes.find((n) => n.id === 'step-1')!

    expect(step.position).toEqual({ x: 250, y: 400 })
  })

  it('synthetic trigger uses workflow.trigger_type as stepType (not "manual" hardcoded)', () => {
    const workflow = makeWorkflow({ trigger_type: 'survey_submitted', steps: [] })
    const nodes = buildInitialNodes(workflow, SYNTHETIC_ID)

    expect((nodes[0].data as { stepType: string }).stepType).toBe('survey_submitted')
  })
})
