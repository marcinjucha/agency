

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messages } from '@/lib/messages'
import { getWorkflowFn, saveWorkflowCanvasFn, toggleWorkflowActiveFn, updateStepSlugFn } from '../server'
import { queryKeys } from '@/lib/query-keys'
import type { SaveCanvasFormData } from '../validation'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import type { WorkflowCanvasHandle, CanvasNodeData, CanvasEdgeData } from './WorkflowCanvas'
import {
  TRIGGER_TYPE_LABELS,
  type WorkflowWithSteps,
  type TriggerType,
  type StepType,
} from '../types'
import { LayoutGrid, FlaskConical, AlertTriangle } from 'lucide-react'
import { Button, ErrorState } from '@agency/ui'
import { ConfigPanelWrapper, getPanelComponent } from './panels'
import type { ConfigPanelProps } from './panels'
import { StepLibraryPanel } from './StepLibraryPanel'
import { TestModePanel } from './TestModePanel'
import { collectAvailableVariables } from '../engine/utils'
import { getStepTypeLabel, getOutputFieldLabel } from '../utils/step-labels'
import { validateAllSteps, type ValidationResult } from '../utils/validate-steps'

const WorkflowCanvas = lazy(() => import('./WorkflowCanvas'))

const TRIGGER_TYPES = new Set<string>([
  'survey_submitted',
  'booking_created',
  'lead_scored',
  'manual',
  'scheduled',
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
  return getStepTypeLabel(stepType as StepType)
}

interface WorkflowEditorProps {
  /** Route param — editor fetches workflow data via useQuery (cache pre-populated by loader) */
  workflowId: string
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const { data: workflow, error: workflowError } = useQuery({
    queryKey: queryKeys.workflows.detail(workflowId),
    queryFn: async () => {
      const data = await getWorkflowFn({ data: { id: workflowId } })
      return data
    },
  })

  if (workflowError) {
    return (
      <ErrorState
        title={messages.workflows.loadFailed}
        message={workflowError instanceof Error ? workflowError.message : messages.common.errorOccurred}
        variant="card"
      />
    )
  }

  if (!workflow) return null

  return <WorkflowEditorContent workflow={workflow} workflowId={workflowId} />
}

interface WorkflowEditorContentProps {
  workflow: WorkflowWithSteps
  workflowId: string
}

function WorkflowEditorContent({ workflow, workflowId }: WorkflowEditorContentProps) {
  const queryClient = useQueryClient()

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
        id: syntheticTriggerIdRef.current,
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
  const [isLibraryOpen, setIsLibraryOpen] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [isActive, setIsActive] = useState(workflow.is_active)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false)

  const handleTestModeToggle = useCallback(() => {
    setIsTestMode((prev) => {
      if (!prev) {
        setSelectedNode(null)
      }
      return !prev
    })
  }, [])

  // Config panel state
  const [selectedNode, setSelectedNode] = useState<{
    id: string
    stepType: string
    stepConfig: Record<string, unknown>
    slug?: string
  } | null>(null)

  const handleNodeSelect = useCallback(
    (nodeId: string | null, stepType: string, stepConfig: Record<string, unknown>) => {
      if (isTestMode) return // Disable config panel in test mode
      if (!nodeId) {
        setSelectedNode(null)
        return
      }
      // Pull slug from the canvas node data — onNodeSelect doesn't ship it directly.
      const node = canvasRef.current?.getNodes().find((n) => n.id === nodeId)
      const slug = node ? ((node.data as { slug?: string }).slug ?? undefined) : undefined
      setSelectedNode({ id: nodeId, stepType, stepConfig, slug })
    },
    [isTestMode]
  )

  const handleSlugCommit = useCallback(
    async (newSlug: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!selectedNode) return { ok: false, error: messages.common.errorOccurred }

      // New (unsaved) steps have no row in DB yet — rename locally only.
      const isPersisted = workflow.steps.some((s) => s.id === selectedNode.id)
      if (!isPersisted) {
        canvasRef.current?.updateNodeData(selectedNode.id, { slug: newSlug })
        setSelectedNode((prev) => (prev ? { ...prev, slug: newSlug } : prev))
        return { ok: true }
      }

      const result = await updateStepSlugFn({
        data: { stepId: selectedNode.id, newSlug },
      })

      if (!result.success) {
        return { ok: false, error: result.error ?? messages.common.errorOccurred }
      }

      const persistedSlug = result.data?.slug ?? newSlug
      canvasRef.current?.updateNodeData(selectedNode.id, { slug: persistedSlug })
      setSelectedNode((prev) => (prev ? { ...prev, slug: persistedSlug } : prev))
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflow.id) })
      return { ok: true }
    },
    [selectedNode, workflow.id, workflow.steps, queryClient]
  )

  const handleConfigChange = useCallback(
    (config: Record<string, unknown>, triggerType?: TriggerType) => {
      if (!selectedNode || !canvasRef.current) return

      // Update node data on canvas — always include label so _name edits update in real-time
      const effectiveName = config._name as string | undefined
      const baseLabel = triggerType ? getLabel(triggerType) : getLabel(selectedNode.stepType)
      const label = effectiveName?.trim() || baseLabel
      canvasRef.current.updateNodeData(selectedNode.id, {
        stepConfig: config,
        label,
        ...(triggerType ? { stepType: triggerType } : {}),
      })

      // Update local selected node state to keep panel in sync
      setSelectedNode((prev) =>
        prev ? { ...prev, stepConfig: config, ...(triggerType ? { stepType: triggerType } : {}) } : prev
      )
    },
    [selectedNode]
  )

  const handlePanelClose = useCallback(() => {
    setSelectedNode(null)
  }, [])

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
          slug: (node.data as { slug?: string }).slug,
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

      // Defensive client-side gate — also enforced on the server.
      // Prevents racy clicks when validation memo hasn't refreshed yet.
      const preflightValidation = validateAllSteps(
        payload.steps.map((s) => ({
          id: s.id ?? crypto.randomUUID(),
          step_type: s.step_type,
          step_config: s.step_config,
        }))
      )
      if (!preflightValidation.isValid) {
        setSaveError(messages.workflows.editor.validationFailed)
        setIsSaving(false)
        return
      }

      const result = await saveWorkflowCanvasFn({ data: { workflowId: workflow.id, data: payload } })

      if (result.success) {
        canvasRef.current?.resetDirty()
        queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
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
      const result = await toggleWorkflowActiveFn({ data: { id: workflow.id, isActive: active } })
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

  const availableVariables = useMemo(() => {
    if (!selectedNode || !canvasRef.current) return []
    const nodes = canvasRef.current.getNodes()
    const edges = canvasRef.current.getEdges()

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

    return collectAvailableVariables(selectedNode.id, steps, edgeList, workflow.trigger_type, getStepTypeLabel, getOutputFieldLabel)
  }, [selectedNode, workflow.trigger_type, isDirty])

  // Live validation derived from canvas state. Re-runs when isDirty toggles
  // (closest reactive proxy for canvas mutations) or when a node is selected
  // (config panel edits flow through onConfigChange → updateNodeData → isDirty).
  const validation = useMemo<ValidationResult>(() => {
    if (!canvasRef.current) {
      return { isValid: true, errors: [], errorsByStepId: new Map() }
    }
    const nodes = canvasRef.current.getNodes()
    const steps = nodes.map((n) => {
      const isSelected = selectedNode !== null && n.id === selectedNode.id
      return {
        id: n.id,
        step_type: isSelected
          ? selectedNode.stepType
          : (n.data as { stepType: string }).stepType,
        step_config: isSelected
          ? selectedNode.stepConfig // synchronously updated via setSelectedNode in handleConfigChange
          : ((n.data as { stepConfig?: Record<string, unknown> }).stepConfig ?? {}) as Record<string, unknown>,
      }
    })
    return validateAllSteps(steps)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedNode is the sync proxy for canvas state
  }, [isDirty, selectedNode, workflow.trigger_type])

  const invalidStepIds = useMemo(
    () => new Set(validation.errorsByStepId.keys()),
    [validation],
  )

  const PanelComponent = selectedNode ? getPanelComponent(selectedNode.stepType) : null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <WorkflowEditorHeader
        workflowId={workflow.id}
        workflowName={workflow.name}
        triggerType={workflow.trigger_type}
        isActive={isActive}
        isDirty={isDirty}
        isSaving={isSaving}
        isValid={validation.isValid}
        validationCount={validation.errors.length}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
      />
      {saveError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
          {saveError}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-row">
        <StepLibraryPanel isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
        <div className="flex-1 min-w-0 relative">
          {!validation.isValid && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-14 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-medium text-amber-600 bg-background border border-amber-500/40 shadow-sm flex items-center gap-1.5 pointer-events-none whitespace-nowrap"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {messages.workflows.editor.validationBannerSummary(validation.errors.length)}
            </div>
          )}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLibraryOpen((prev) => !prev)}
              className="gap-1.5"
              aria-label={messages.workflows.editor.stepLibraryToggle}
            >
              <LayoutGrid className="h-4 w-4" />
              {messages.workflows.editor.stepLibraryToggle}
            </Button>
            <Button
              variant={isTestMode ? 'default' : 'outline'}
              size="sm"
              onClick={handleTestModeToggle}
              className="gap-1.5"
              aria-label={messages.workflows.testMode.toggle}
            >
              <FlaskConical className="h-4 w-4" />
              {messages.workflows.testMode.toggle}
            </Button>
          </div>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">{messages.workflows.editor.canvasLoading}</div>}>
            <WorkflowCanvas
              ref={canvasRef}
              workflowId={workflow.id}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              onDirtyChange={handleDirtyChange}
              onNodeSelect={handleNodeSelect}
              hasTriggerNode={hasTriggerNode}
              triggerType={workflow.trigger_type}
              getLabel={getLabel}
              invalidStepIds={invalidStepIds}
            />
          </Suspense>
        </div>
        {isTestMode ? (
          <TestModePanel
            workflowId={workflow.id}
            triggerType={workflow.trigger_type}
            isActive={isActive}
            onClose={handleTestModeToggle}
          />
        ) : (
          selectedNode && PanelComponent && (
            <ConfigPanelWrapper
              nodeId={selectedNode.id}
              stepType={selectedNode.stepType}
              slug={isTriggerType(selectedNode.stepType) ? undefined : selectedNode.slug}
              onSlugCommit={isTriggerType(selectedNode.stepType) ? undefined : handleSlugCommit}
              stepConfig={selectedNode.stepConfig}
              onStepConfigChange={handleConfigChange}
              onClose={handlePanelClose}
            >
              <PanelComponent
                nodeId={selectedNode.id}
                stepType={selectedNode.stepType}
                stepConfig={selectedNode.stepConfig}
                onChange={handleConfigChange}
                triggerType={workflow.trigger_type}
                availableVariables={availableVariables}
                isInvalid={validation.errorsByStepId.has(selectedNode.id)}
              />
            </ConfigPanelWrapper>
          )
        )}
      </div>
    </div>
  )
}
