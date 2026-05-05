import {
  TRIGGER_TYPE_LABELS,
  type WorkflowWithSteps,
  type TriggerType,
  type StepType,
} from '../types'
import type { CanvasNodeData } from '../components/WorkflowCanvas'
import { getStepTypeLabel } from './step-labels'

const TRIGGER_TYPES = new Set<string>([
  'survey_submitted',
  'booking_created',
  'lead_scored',
  'manual',
  'scheduled',
])

export function isTriggerType(type: string): type is TriggerType {
  return TRIGGER_TYPES.has(type)
}

export function getNodeType(stepType: string): string {
  if (isTriggerType(stepType)) return 'trigger'
  return stepType
}

export function getLabel(stepType: string): string {
  if (isTriggerType(stepType)) {
    return TRIGGER_TYPE_LABELS[stepType as TriggerType] ?? stepType
  }
  return getStepTypeLabel(stepType as StepType)
}

/**
 * Builds the initial CanvasNodeData[] for a workflow on editor mount.
 * WHY: synthetic-trigger fallback ensures empty workflows have a UI bootstrap
 * for the trigger when no DB-backed trigger step exists (AAA-T-211 removed
 * AddNodeDropdown; canvas drag-drop also rejects trigger drops by design).
 */
export function buildInitialNodes(
  workflow: WorkflowWithSteps,
  syntheticTriggerId: string,
): CanvasNodeData[] {
  const stepNodes: CanvasNodeData[] = workflow.steps.map((step) => {
    const isTrigger = getNodeType(step.step_type) === 'trigger'
    return {
      id: step.id,
      type: getNodeType(step.step_type),
      position: { x: step.position_x, y: step.position_y },
      deletable: isTrigger ? false : undefined,
      data: {
        label: (step.step_config as Record<string, unknown>)?._name as string ?? getLabel(step.step_type),
        stepType: step.step_type,
        stepConfig: step.step_config,
        slug: step.slug,
      },
    }
  })

  // Always render a synthetic trigger node when the workflow has no trigger step.
  // 'manual' is a legitimate trigger type (not a placeholder), and AAA-T-211 removed
  // the AddNodeDropdown — without a synthetic trigger, empty workflows have no UI to
  // bootstrap a trigger and the canvas drag-drop also rejects trigger drops by design.
  const hasTriggerStep = stepNodes.some((n) => n.type === 'trigger')
  if (!hasTriggerStep) {
    stepNodes.unshift({
      id: syntheticTriggerId,
      type: 'trigger',
      position: { x: 50, y: 150 },
      deletable: false,
      data: {
        label: getLabel(workflow.trigger_type),
        stepType: workflow.trigger_type,
        stepConfig: workflow.trigger_config,
        slug: 'trigger',
      },
    })
  }

  return stepNodes
}
