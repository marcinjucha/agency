import { validateAllSteps, type ValidationResult } from './validate-steps'
import type { WorkflowCanvasHandle } from '../components/WorkflowCanvas'
import type { SelectedNodeState } from './compute-available-variables'

/**
 * Live validation derived from canvas state. The selected-node config is
 * read from `selectedNode` instead of the canvas because `setSelectedNode`
 * inside `handleConfigChange` is the synchronous proxy for the unsaved
 * in-memory edit (canvas dataflow is async via updateNodeData).
 */
export function computeValidation(
  canvas: WorkflowCanvasHandle | null,
  selectedNode: SelectedNodeState,
): ValidationResult {
  if (!canvas) {
    return { isValid: true, errors: [], errorsByStepId: new Map() }
  }
  const nodes = canvas.getNodes()
  const steps = nodes.map((n) => {
    const isSelected = selectedNode !== null && n.id === selectedNode.id
    return {
      id: n.id,
      step_type: isSelected
        ? selectedNode.stepType
        : (n.data as { stepType: string }).stepType,
      step_config: isSelected
        ? selectedNode.stepConfig
        : ((n.data as { stepConfig?: Record<string, unknown> }).stepConfig ?? {}) as Record<string, unknown>,
    }
  })
  return validateAllSteps(steps)
}
