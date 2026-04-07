import { describe, it, expect } from 'vitest'
import {
  topologicalSort,
  getNestedValue,
  resolveVariables,
  buildTriggerContext,
} from '../utils'
import type { TriggerPayload } from '../types'
import { makeStep as makeStepBase, makeEdge as makeEdgeBase } from '../../__tests__/fixtures'
import type { WorkflowStep, WorkflowEdge } from '../../types'

// ---------------------------------------------------------------------------
// Test helpers — local wrappers matching original signatures
// ---------------------------------------------------------------------------

function makeStep(id: string, overrides?: Partial<WorkflowStep>): WorkflowStep {
  const step = makeStepBase(id)
  return { ...step, ...overrides } as WorkflowStep
}

function makeEdge(
  source: string,
  target: string,
  overrides?: Partial<WorkflowEdge>
): WorkflowEdge {
  const edge = makeEdgeBase(source, target)
  return { ...edge, ...overrides } as WorkflowEdge
}

// ---------------------------------------------------------------------------
// topologicalSort
// ---------------------------------------------------------------------------

describe('topologicalSort', () => {
  it('sorts a linear chain A -> B -> C in correct order', () => {
    const steps = [makeStep('A'), makeStep('B'), makeStep('C')]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')]

    const result = topologicalSort(steps, edges)

    expect(result.map((s) => s.id)).toEqual(['A', 'B', 'C'])
  })

  it('handles diamond graph: D comes after both B and C', () => {
    const steps = [makeStep('A'), makeStep('B'), makeStep('C'), makeStep('D')]
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('A', 'C'),
      makeEdge('B', 'D'),
      makeEdge('C', 'D'),
    ]

    const result = topologicalSort(steps, edges)
    const ids = result.map((s) => s.id)

    // A must come first, D must come last
    expect(ids[0]).toBe('A')
    expect(ids[ids.length - 1]).toBe('D')
    // B and C must both come before D
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'))
    expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('D'))
  })

  it('returns single step when no edges exist', () => {
    const steps = [makeStep('solo')]
    const result = topologicalSort(steps, [])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('solo')
  })

  it('returns empty array for empty input', () => {
    const result = topologicalSort([], [])
    expect(result).toEqual([])
  })

  it('throws on cycle: A -> B -> A', () => {
    const steps = [makeStep('A'), makeStep('B')]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'A')]

    expect(() => topologicalSort(steps, edges)).toThrow(/cycle/i)
  })

  it('throws on larger cycle: A -> B -> C -> A', () => {
    const steps = [makeStep('A'), makeStep('B'), makeStep('C')]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'A')]

    expect(() => topologicalSort(steps, edges)).toThrow(/cycle/i)
  })

  it('silently skips dangling edges referencing non-existent steps', () => {
    const steps = [makeStep('A'), makeStep('B')]
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('A', 'ghost'), // ghost does not exist
      makeEdge('phantom', 'B'), // phantom does not exist
    ]

    const result = topologicalSort(steps, edges)

    expect(result.map((s) => s.id)).toEqual(['A', 'B'])
  })

  it('handles parallel branches: A -> B, A -> C — both after A', () => {
    const steps = [makeStep('A'), makeStep('B'), makeStep('C')]
    const edges = [makeEdge('A', 'B'), makeEdge('A', 'C')]

    const result = topologicalSort(steps, edges)
    const ids = result.map((s) => s.id)

    expect(ids[0]).toBe('A')
    expect(ids).toContain('B')
    expect(ids).toContain('C')
    expect(ids.indexOf('B')).toBeGreaterThan(0)
    expect(ids.indexOf('C')).toBeGreaterThan(0)
  })

  it('includes both condition branches regardless of condition_branch value', () => {
    const steps = [makeStep('cond'), makeStep('yes'), makeStep('no')]
    const edges = [
      makeEdge('cond', 'yes', { condition_branch: 'true' }),
      makeEdge('cond', 'no', { condition_branch: 'false' }),
    ]

    const result = topologicalSort(steps, edges)
    const ids = result.map((s) => s.id)

    expect(ids[0]).toBe('cond')
    expect(ids).toContain('yes')
    expect(ids).toContain('no')
  })
})

// ---------------------------------------------------------------------------
// getNestedValue
// ---------------------------------------------------------------------------

describe('getNestedValue', () => {
  it('returns value for simple path', () => {
    expect(getNestedValue({ name: 'John' }, 'name')).toBe('John')
  })

  it('returns value for nested path', () => {
    expect(getNestedValue({ data: { score: 10 } }, 'data.score')).toBe(10)
  })

  it('returns value for deep nesting', () => {
    expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for missing top-level path', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined()
  })

  it('returns undefined for missing deep path', () => {
    expect(getNestedValue({ a: { b: 1 } }, 'a.c')).toBeUndefined()
  })

  it('returns undefined when null appears in the chain', () => {
    expect(getNestedValue({ a: null } as Record<string, unknown>, 'a.b')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// resolveVariables
// ---------------------------------------------------------------------------

describe('resolveVariables', () => {
  it('replaces a simple variable', () => {
    expect(resolveVariables('Hello {{name}}', { name: 'John' })).toBe('Hello John')
  })

  it('replaces multiple variables', () => {
    expect(resolveVariables('{{a}} and {{b}}', { a: '1', b: '2' })).toBe('1 and 2')
  })

  it('resolves nested path variables', () => {
    expect(resolveVariables('Score: {{data.score}}', { data: { score: 10 } })).toBe(
      'Score: 10'
    )
  })

  it('leaves unresolved variables as-is', () => {
    expect(resolveVariables('Hello {{unknown}}', {})).toBe('Hello {{unknown}}')
  })

  it('leaves null values as placeholder', () => {
    expect(resolveVariables('Hello {{name}}', { name: null })).toBe('Hello {{name}}')
  })

  it('returns plain text unchanged', () => {
    expect(resolveVariables('plain text', {})).toBe('plain text')
  })

  it('handles whitespace inside variable braces', () => {
    expect(resolveVariables('{{ name }}', { name: 'John' })).toBe('John')
  })

  it('converts number values to string', () => {
    expect(resolveVariables('Count: {{n}}', { n: 42 })).toBe('Count: 42')
  })
})

// ---------------------------------------------------------------------------
// buildTriggerContext
// ---------------------------------------------------------------------------

describe('buildTriggerContext', () => {
  it('maps survey_submitted with responseId and surveyLinkId', () => {
    const payload: TriggerPayload = {
      trigger_type: 'survey_submitted',
      responseId: 'resp-1',
      surveyLinkId: 'link-1',
    }

    const ctx = buildTriggerContext('survey_submitted', payload)

    expect(ctx).toEqual({
      trigger_type: 'survey_submitted',
      responseId: 'resp-1',
      surveyLinkId: 'link-1',
    })
  })

  it('maps booking_created with required + optional fields', () => {
    const payload: TriggerPayload = {
      trigger_type: 'booking_created',
      appointmentId: 'apt-1',
      clientEmail: 'test@example.com',
      appointmentAt: '2026-04-07T10:00:00Z',
    }

    const ctx = buildTriggerContext('booking_created', payload)

    expect(ctx).toEqual({
      trigger_type: 'booking_created',
      appointmentId: 'apt-1',
      clientEmail: 'test@example.com',
      appointmentAt: '2026-04-07T10:00:00Z',
    })
  })

  it('omits undefined optional fields from booking_created context', () => {
    const payload: TriggerPayload = {
      trigger_type: 'booking_created',
      appointmentId: 'apt-1',
      // responseId, surveyLinkId, clientEmail, appointmentAt all undefined
    }

    const ctx = buildTriggerContext('booking_created', payload)

    expect(ctx).toEqual({
      trigger_type: 'booking_created',
      appointmentId: 'apt-1',
    })
    expect(ctx).not.toHaveProperty('responseId')
    expect(ctx).not.toHaveProperty('clientEmail')
    expect(ctx).not.toHaveProperty('appointmentAt')
  })

  it('remaps lead_scored score -> overallScore (critical non-obvious remapping)', () => {
    const payload: TriggerPayload = {
      trigger_type: 'lead_scored',
      responseId: 'resp-1',
      score: 15,
      recommendation: 'QUALIFIED',
    }

    const ctx = buildTriggerContext('lead_scored', payload)

    // score field from payload becomes overallScore in context
    expect(ctx).toHaveProperty('overallScore', 15)
    expect(ctx).not.toHaveProperty('score')
    expect(ctx).toEqual({
      trigger_type: 'lead_scored',
      responseId: 'resp-1',
      overallScore: 15,
      recommendation: 'QUALIFIED',
    })
  })

  it('includes optional summary and analyzedAt for lead_scored when provided', () => {
    const payload: TriggerPayload = {
      trigger_type: 'lead_scored',
      responseId: 'resp-1',
      score: 12,
      recommendation: 'NEEDS_MORE_INFO',
      summary: 'Needs follow-up',
      analyzedAt: '2026-04-07T12:00:00Z',
    }

    const ctx = buildTriggerContext('lead_scored', payload)

    expect(ctx).toHaveProperty('summary', 'Needs follow-up')
    expect(ctx).toHaveProperty('analyzedAt', '2026-04-07T12:00:00Z')
  })

  it('returns only trigger_type for manual trigger', () => {
    const payload: TriggerPayload = { trigger_type: 'manual' }

    const ctx = buildTriggerContext('manual', payload)

    expect(ctx).toEqual({ trigger_type: 'manual' })
  })

  it('returns only trigger_type for scheduled trigger', () => {
    const payload: TriggerPayload = { trigger_type: 'scheduled' }

    const ctx = buildTriggerContext('scheduled', payload)

    expect(ctx).toEqual({ trigger_type: 'scheduled' })
  })

  it('returns base context for unknown trigger type (fallback)', () => {
    // Force an unknown trigger type through the default branch
    const payload = { trigger_type: 'unknown_future_type' } as unknown as TriggerPayload

    const ctx = buildTriggerContext('unknown_future_type', payload)

    expect(ctx).toEqual({ trigger_type: 'unknown_future_type' })
  })
})
