import type { WorkflowStep, WorkflowEdge } from '../types'
import type { TriggerPayload, VariableContext } from './types'

/**
 * Sorts workflow steps in topological (execution) order.
 *
 * Steps with no incoming edges execute first.
 * Condition branching (edges with condition_branch: 'true'|'false'|null) is respected
 * but does not affect ordering — runtime decides which branch to follow.
 *
 * Uses Kahn's algorithm (BFS-based) to avoid recursion depth issues on large graphs.
 * Throws if the graph contains a cycle.
 */
export function topologicalSort(
  steps: WorkflowStep[],
  edges: WorkflowEdge[]
): WorkflowStep[] {
  const stepMap = new Map(steps.map((s) => [s.id, s]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  for (const step of steps) {
    inDegree.set(step.id, 0)
    adjacency.set(step.id, [])
  }

  // Build graph — skip dangling edges referencing non-existent steps
  for (const edge of edges) {
    if (!stepMap.has(edge.source_step_id) || !stepMap.has(edge.target_step_id)) {
      console.warn(
        `[topologicalSort] Skipping dangling edge ${edge.source_step_id} → ${edge.target_step_id}: one or both steps not found`
      )
      continue
    }

    const targets = adjacency.get(edge.source_step_id)
    if (targets) {
      targets.push(edge.target_step_id)
    }
    inDegree.set(
      edge.target_step_id,
      (inDegree.get(edge.target_step_id) ?? 0) + 1
    )
  }

  // Kahn's algorithm — start with nodes that have no incoming edges
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const sorted: WorkflowStep[] = []

  while (queue.length > 0) {
    const current = queue.shift()!
    const step = stepMap.get(current)
    if (step) {
      sorted.push(step)
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (sorted.length !== steps.length) {
    throw new Error(
      `Workflow graph contains a cycle. Sorted ${sorted.length} of ${steps.length} steps.`
    )
  }

  return sorted
}

/**
 * Resolves {{variableName}} and {{nested.path}} placeholders in a template string.
 *
 * Uses string replacement only (no eval).
 * Unresolved variables are left as-is (e.g., {{unknown}} stays in output).
 */
export function resolveVariables(
  template: string,
  context: VariableContext
): string {
  return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim()
    const value = getNestedValue(context, key)

    if (value === undefined || value === null) {
      return `{{${key}}}`
    }

    return String(value)
  })
}

/**
 * Traverses a nested object by dot-separated path.
 * e.g., getNestedValue({ a: { b: 'c' } }, 'a.b') => 'c'
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Builds the variable context available to workflow steps from trigger data.
 *
 * Maps trigger-specific fields into a flat namespace that matches
 * the variable schemas defined in lib/trigger-schemas.ts.
 */
export function buildTriggerContext(
  triggerType: string,
  triggerPayload: TriggerPayload
): VariableContext {
  const base: VariableContext = {
    trigger_type: triggerType,
  }

  switch (triggerPayload.trigger_type) {
    case 'survey_submitted':
      return {
        ...base,
        responseId: triggerPayload.responseId,
        surveyLinkId: triggerPayload.surveyLinkId,
      }

    case 'booking_created':
      return {
        ...base,
        appointmentId: triggerPayload.appointmentId,
        ...(triggerPayload.responseId && { responseId: triggerPayload.responseId }),
      }

    case 'lead_scored':
      return {
        ...base,
        responseId: triggerPayload.responseId,
        overallScore: triggerPayload.score,
        recommendation: triggerPayload.recommendation,
      }

    case 'manual':
    case 'scheduled':
      return base

    default:
      return base
  }
}
