import type { StepExecutionWithMeta } from '../types'

export interface StepAttemptGroup {
  /** DB step_id — constant per step, does not change across attempts */
  step_id: string
  /** step_type from the latest attempt (highest attempt_number) */
  step_type: string
  /** All attempts for this step, sorted attempt_number ASC */
  attempts: StepExecutionWithMeta[]
}

/**
 * Groups step executions by step_id, sorting each group attempt_number ASC.
 * Preserves order of first appearance (topological order).
 *
 * WHY: A workflow may have multiple attempt_number per step after retry. UI shows
 * the latest attempt prominently and previous attempts in a collapsible accordion.
 */
export function groupAttemptsByStep(
  stepExecutions: StepExecutionWithMeta[]
): StepAttemptGroup[] {
  const orderMap = new Map<string, number>()
  const groupMap = new Map<string, StepExecutionWithMeta[]>()

  for (const exec of stepExecutions) {
    if (!orderMap.has(exec.step_id)) {
      orderMap.set(exec.step_id, orderMap.size)
      groupMap.set(exec.step_id, [])
    }
    groupMap.get(exec.step_id)!.push(exec)
  }

  return Array.from(groupMap.entries())
    .sort(([aId], [bId]) => orderMap.get(aId)! - orderMap.get(bId)!)
    .map(([step_id, attempts]) => {
      const sortedAsc = [...attempts].sort((a, b) => a.attempt_number - b.attempt_number)
      const latestAttempt = [...attempts].sort((a, b) => b.attempt_number - a.attempt_number)[0]
      return {
        step_id,
        step_type: latestAttempt.step_type,
        attempts: sortedAsc,
      }
    })
}
