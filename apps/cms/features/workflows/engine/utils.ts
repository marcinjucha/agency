import type { WorkflowStep, WorkflowEdge } from '../types'
import type { OutputSchemaField, StepType } from '../step-registry'
import { STEP_OUTPUT_SCHEMAS, STEP_TYPE_LABEL_KEYS } from '../step-registry'
import type { TriggerPayload, VariableContext } from './types'
import { isTriggerType } from './types'
import { getTriggerVariables } from '@/lib/trigger-schemas'

/** Variable item compatible with @agency/ui VariableInserterPopover */
export type VariableItem = {
  key: string
  label: string
  description?: string
  category?: string
}

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
 * Collects all variables available to a given step by walking backward through edges.
 * Returns VariableItem[] with category set to source name (e.g., "Trigger", "Krok 1: Wyślij email").
 */
/**
 * Optional resolver for step type labels.
 * UI callers (WorkflowEditor) pass getStepTypeLabel from utils/step-labels.ts.
 * Test callers and engine/utils.ts (zero-dep) omit it — falls back to labelKey (machine string).
 * WHY: engine/utils.ts must stay zero-dependency (no messages.ts import).
 */
export function collectAvailableVariables(
  stepId: string,
  steps: Array<{ id: string; step_type: string; step_config: Record<string, unknown> }>,
  edges: Array<{ source_step_id: string; target_step_id: string }>,
  triggerType: string,
  resolveStepLabel?: (stepType: string) => string
): VariableItem[] {
  // 1. Build reverse adjacency map: target → [sources]
  const reverseAdj = new Map<string, string[]>()
  for (const edge of edges) {
    const sources = reverseAdj.get(edge.target_step_id) ?? []
    sources.push(edge.source_step_id)
    reverseAdj.set(edge.target_step_id, sources)
  }

  // 2. BFS backward from stepId to find all ancestor step IDs
  const ancestors = new Set<string>()
  const queue = [stepId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const source of reverseAdj.get(current) ?? []) {
      if (!ancestors.has(source)) {
        ancestors.add(source)
        queue.push(source)
      }
    }
  }

  // 3. Collect trigger variables
  const triggerVars: VariableItem[] = getTriggerVariables(triggerType).map((tv) => ({
    key: tv.key,
    label: tv.label,
    description: tv.description,
    category: 'Trigger',
  }))

  // 4. Order ancestors topologically (closest first) using existing topologicalSort
  const stepMap = new Map(steps.map((s) => [s.id, s]))
  const ancestorSteps = steps.filter((s) => ancestors.has(s.id) && !isTriggerType(s.step_type))

  // Use topologicalSort for ordering — need WorkflowStep-shaped objects
  const relevantEdges = edges.filter(
    (e) => ancestors.has(e.source_step_id) && ancestors.has(e.target_step_id)
  )
  const sorted = topologicalSort(
    ancestorSteps as WorkflowStep[],
    relevantEdges as WorkflowEdge[]
  )

  // 5. Map each ancestor step's output schema to VariableItem[]
  const stepVars: VariableItem[] = []
  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i]
    const stepType = step.step_type as StepType
    const stepNum = i + 1
    const labelKey = STEP_TYPE_LABEL_KEYS[stepType] ?? stepType
    const resolvedLabel = resolveStepLabel ? resolveStepLabel(stepType) : labelKey
    const category = `Krok ${stepNum}: ${resolvedLabel}`

    // For ai_action: check custom output_schema in config first
    let fields: OutputSchemaField[]
    const config = step.step_config as Record<string, unknown>
    if (stepType === 'ai_action' && Array.isArray(config.output_schema)) {
      fields = config.output_schema as OutputSchemaField[]
    } else {
      fields = STEP_OUTPUT_SCHEMAS[stepType] ?? []
    }

    for (const field of fields) {
      stepVars.push({
        key: field.key,
        label: field.label,
        category,
      })
    }
  }

  return [...triggerVars, ...stepVars]
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
        ...(triggerPayload.responseId !== undefined && { responseId: triggerPayload.responseId }),
        ...(triggerPayload.surveyLinkId !== undefined && { surveyLinkId: triggerPayload.surveyLinkId }),
        ...(triggerPayload.clientEmail !== undefined && { clientEmail: triggerPayload.clientEmail }),
        ...(triggerPayload.appointmentAt !== undefined && { appointmentAt: triggerPayload.appointmentAt }),
      }

    case 'lead_scored':
      return {
        ...base,
        responseId: triggerPayload.responseId,
        overallScore: triggerPayload.score,
        recommendation: triggerPayload.recommendation,
        ...(triggerPayload.summary !== undefined && { summary: triggerPayload.summary }),
        ...(triggerPayload.analyzedAt !== undefined && { analyzedAt: triggerPayload.analyzedAt }),
      }

    case 'manual':
    case 'scheduled':
      return base

    default:
      return base
  }
}
