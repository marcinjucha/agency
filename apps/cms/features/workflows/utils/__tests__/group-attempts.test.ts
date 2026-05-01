import { describe, it, expect } from 'vitest'
import { groupAttemptsByStep } from '../group-attempts'
import type { StepExecutionWithMeta } from '../../types'

// Minimal stub factory
function makeStep(
  overrides: Partial<StepExecutionWithMeta> & { step_id: string }
): StepExecutionWithMeta {
  return {
    id: overrides.id ?? `${overrides.step_id}-${overrides.attempt_number ?? 1}`,
    execution_id: 'exec-1',
    step_id: overrides.step_id,
    step_type: overrides.step_type ?? 'send_email',
    status: overrides.status ?? 'completed',
    attempt_number: overrides.attempt_number ?? 1,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    error_message: null,
    input_payload: null,
    output_payload: null,
    resume_at: null,
  }
}

describe('groupAttemptsByStep', () => {
  it('returns empty array for empty input', () => {
    expect(groupAttemptsByStep([])).toEqual([])
  })

  it('groups single attempt per step', () => {
    const steps = [
      makeStep({ step_id: 'step-a', step_type: 'trigger' }),
      makeStep({ step_id: 'step-b', step_type: 'send_email' }),
      makeStep({ step_id: 'step-c', step_type: 'ai_action' }),
    ]
    const groups = groupAttemptsByStep(steps)
    expect(groups).toHaveLength(3)
    expect(groups[0].step_id).toBe('step-a')
    expect(groups[0].attempts).toHaveLength(1)
    expect(groups[2].step_id).toBe('step-c')
  })

  it('groups multiple attempts for same step, sorted attempt_number ASC', () => {
    const steps = [
      makeStep({ step_id: 'step-a', attempt_number: 1, status: 'completed' }),
      makeStep({ step_id: 'step-b', attempt_number: 1, status: 'failed' }),
      makeStep({ step_id: 'step-b', attempt_number: 2, status: 'completed' }), // retry
    ]
    const groups = groupAttemptsByStep(steps)
    expect(groups).toHaveLength(2)
    expect(groups[1].step_id).toBe('step-b')
    expect(groups[1].attempts).toHaveLength(2)
    expect(groups[1].attempts[0].attempt_number).toBe(1) // oldest first
    expect(groups[1].attempts[1].attempt_number).toBe(2)
  })

  it('handles cancelled prior attempt followed by new attempt (Iter 6 to Iter 4 scenario)', () => {
    const steps = [
      makeStep({ step_id: 'step-a', attempt_number: 1, status: 'completed' }),
      makeStep({ step_id: 'step-b', attempt_number: 1, status: 'failed' }),
      makeStep({ step_id: 'step-c', attempt_number: 1, status: 'cancelled' }), // Iter 6 cancel
      makeStep({ step_id: 'step-c', attempt_number: 2, status: 'completed' }), // retry
    ]
    const groups = groupAttemptsByStep(steps)
    expect(groups).toHaveLength(3)
    const groupC = groups[2]
    expect(groupC.step_id).toBe('step-c')
    expect(groupC.attempts).toHaveLength(2)
    expect(groupC.attempts[0].status).toBe('cancelled')
    expect(groupC.attempts[1].status).toBe('completed')
    // step_type from latest (attempt 2)
    expect(groupC.step_type).toBe(steps[3].step_type)
  })

  it('preserves topological order (order of first appearance)', () => {
    // steps come in mixed order — first appearance of step-c is at index 0
    const steps = [
      makeStep({ step_id: 'step-c', attempt_number: 2 }),
      makeStep({ step_id: 'step-a', attempt_number: 1 }),
      makeStep({ step_id: 'step-b', attempt_number: 1 }),
      makeStep({ step_id: 'step-c', attempt_number: 1 }),
    ]
    // First appearances: c(0), a(1), b(2) — group order follows first appearance
    const groups = groupAttemptsByStep(steps)
    expect(groups[0].step_id).toBe('step-c')
    expect(groups[1].step_id).toBe('step-a')
    expect(groups[2].step_id).toBe('step-b')
  })

  it('picks step_type from latest attempt (highest attempt_number)', () => {
    const steps = [
      makeStep({ step_id: 'step-x', attempt_number: 1, step_type: 'send_email', status: 'failed' }),
      makeStep({ step_id: 'step-x', attempt_number: 3, step_type: 'webhook', status: 'completed' }),
      makeStep({ step_id: 'step-x', attempt_number: 2, step_type: 'send_email', status: 'failed' }),
    ]
    const groups = groupAttemptsByStep(steps)
    expect(groups).toHaveLength(1)
    expect(groups[0].step_type).toBe('webhook') // from attempt 3
    expect(groups[0].attempts[0].attempt_number).toBe(1) // sorted ASC
    expect(groups[0].attempts[2].attempt_number).toBe(3)
  })
})
