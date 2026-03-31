'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { messages } from '@/lib/messages'
import { saveWorkflowCanvas, toggleWorkflowActive } from '../actions'
import type { SaveCanvasFormData } from '../validation'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import type { WorkflowCanvasHandle, CanvasNodeData, CanvasEdgeData } from './WorkflowCanvas'
import {
  TRIGGER_TYPE_LABELS,
  STEP_TYPE_LABELS,
  type WorkflowWithSteps,
  type TriggerType,
  type StepType,
} from '../types'

const WorkflowCanvas = dynamic(() => import('./WorkflowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      {messages.workflows.editor.canvasLoading}
    </div>
  ),
})

const TRIGGER_TYPES = new Set<string>([
  'survey_submitted',
  'booking_created',
  'lead_scored',
  'manual',
])

function isTriggerType(type: string): type is TriggerType {
  return TRIGGER_TYPES.has(type)
}

function getNodeType(stepType: string): string {
  if (isTriggerType(stepType)) return 'trigger'
  return stepType
}

function getLabel(stepType: string): string {
  if (isTriggerType(stepType)) {
    return TRIGGER_TYPE_LABELS[stepType as TriggerType] ?? stepType
  }
  return STEP_TYPE_LABELS[stepType as StepType] ?? stepType
}

interface WorkflowEditorProps {
  workflow: WorkflowWithSteps
}

export function WorkflowEditor({ workflow }: WorkflowEditorProps) {
  // Stable UUID for synthetic trigger node (when no trigger step exists in DB)
  const syntheticTriggerIdRef = useRef(crypto.randomUUID())

  const initialNodes = useMemo<CanvasNodeData[]>(() => {
    const stepNodes: CanvasNodeData[] = workflow.steps.map((step) => {
      const isTrigger = getNodeType(step.step_type) === 'trigger'
      return {
        id: step.id,
        type: getNodeType(step.step_type),
        position: { x: step.position_x, y: step.position_y },
        deletable: isTrigger ? false : undefined,
        data: {
          label: getLabel(step.step_type),
          stepType: step.step_type,
          stepConfig: step.step_config,
        },
      }
    })

    // When trigger_type is 'manual' (default from dialog), don't add a synthetic trigger node.
    // Let the user add one from the canvas dropdown instead.
    const hasTriggerStep = stepNodes.some((n) => n.type === 'trigger')
    if (!hasTriggerStep && workflow.trigger_type !== 'manual') {
      stepNodes.unshift({
        id: syntheticTriggerIdRef.current,
        type: 'trigger',
        position: { x: 50, y: 150 },
        deletable: false,
        data: {
          label: getLabel(workflow.trigger_type),
          stepType: workflow.trigger_type,
          stepConfig: workflow.trigger_config,
        },
      })
    }

    return stepNodes
  }, [workflow])

  const initialEdges = useMemo<CanvasEdgeData[]>(
    () =>
      workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source_step_id,
        target: edge.target_step_id,
        sourceHandle: edge.condition_branch || undefined,
      })),
    [workflow]
  )

  const hasTriggerNode = useMemo(
    () => initialNodes.some((n) => n.type === 'trigger'),
    [initialNodes]
  )

  const canvasRef = useRef<WorkflowCanvasHandle>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isActive, setIsActive] = useState(workflow.is_active)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
  }, [])

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const currentNodes = canvasRef.current.getNodes()
      const currentEdges = canvasRef.current.getEdges()

      const payload: SaveCanvasFormData = {
        steps: currentNodes.map((node) => ({
          // All node IDs are valid UUIDs — include them all so the DB upserts correctly
          id: node.id,
          step_type: (node.data as { stepType: string }).stepType as SaveCanvasFormData['steps'][number]['step_type'],
          step_config: (node.data as { stepConfig: Record<string, unknown> }).stepConfig ?? {},
          position_x: node.position.x,
          position_y: node.position.y,
        })),
        edges: currentEdges.map((edge, idx) => ({
          source_step_id: edge.source,
          target_step_id: edge.target,
          condition_branch: edge.sourceHandle || null,
          sort_order: idx,
        })),
      }

      const result = await saveWorkflowCanvas(workflow.id, payload)

      if (result.success) {
        canvasRef.current?.resetDirty()
      } else {
        setSaveError(result.error ?? messages.workflows.editor.saveFailed)
      }
    } catch {
      setSaveError(messages.workflows.editor.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }, [workflow.id])

  const handleToggleActive = useCallback(
    async (active: boolean) => {
      setIsActive(active)
      const result = await toggleWorkflowActive(workflow.id, active)
      if (!result.success) {
        setIsActive(!active)
        console.error('Toggle failed:', result.error)
      }
    },
    [workflow.id]
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, isSaving, handleSave])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <WorkflowEditorHeader
        workflowId={workflow.id}
        workflowName={workflow.name}
        triggerType={workflow.trigger_type}
        isActive={isActive}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
      />
      {saveError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
          {saveError}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <WorkflowCanvas
          ref={canvasRef}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onDirtyChange={handleDirtyChange}
          hasTriggerNode={hasTriggerNode}
          triggerType={workflow.trigger_type}
          getLabel={getLabel}
        />
      </div>
    </div>
  )
}
