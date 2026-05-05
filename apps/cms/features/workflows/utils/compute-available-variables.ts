import { collectAvailableVariables } from '../engine/utils'
import { getStepTypeLabel, getOutputFieldLabel } from './step-labels'
import type { WorkflowCanvasHandle } from '../components/WorkflowCanvas'

export type SelectedNodeState = {
  id: string
  stepType: string
  stepConfig: Record<string, unknown>
  slug?: string
} | null

/**
 * Adapts the live canvas + selected-node state into the shape required by
 * `collectAvailableVariables`. WHY: returns [] early when no node is selected
 * or canvas is unmounted — keeps panel render paths defensive against the
 * brief window before the lazy-loaded canvas attaches its imperative handle.
 */
export function computeAvailableVariables(
  selectedNode: SelectedNodeState,
  canvas: WorkflowCanvasHandle | null,
  triggerType: string,
): ReturnType<typeof collectAvailableVariables> {
  if (!selectedNode || !canvas) return []
  const nodes = canvas.getNodes()
  const edges = canvas.getEdges()

  const steps = nodes.map((n) => ({
    id: n.id,
    slug: ((n.data as { slug?: string }).slug ?? n.id),
    step_type: (n.data as { stepType: string }).stepType,
    step_config: ((n.data as { stepConfig?: Record<string, unknown> }).stepConfig ?? {}) as Record<string, unknown>,
  }))
  const edgeList = edges.map((e) => ({
    source_step_id: e.source,
    target_step_id: e.target,
  }))

  return collectAvailableVariables(
    selectedNode.id,
    steps,
    edgeList,
    triggerType,
    getStepTypeLabel,
    getOutputFieldLabel,
  )
}
