

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { messages } from '@/lib/messages'
import { getWorkflowFn, saveWorkflowCanvasFn, toggleWorkflowActiveFn, updateStepSlugFn } from '../server'
import { queryKeys } from '@/lib/query-keys'
import type { SaveCanvasFormData } from '../validation'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import type { WorkflowCanvasHandle, CanvasNodeData, CanvasEdgeData } from './WorkflowCanvas'
import { type WorkflowWithSteps, type TriggerType } from '../types'
import { validateAllSteps } from '../utils/validate-steps'
import { LayoutGrid, FlaskConical, History, AlertTriangle } from 'lucide-react'
import { Button, ErrorState } from '@agency/ui'
import { ConfigPanelWrapper, getPanelComponent } from './panels'
import type { ConfigPanelProps } from './panels'
import { StepLibraryPanel } from './StepLibraryPanel'
import { TestModePanel } from './TestModePanel'
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel'
import { buildInitialNodes, getLabel, isTriggerType } from '../utils/build-initial-nodes'
import { computeAvailableVariables } from '../utils/compute-available-variables'
import { computeValidation } from '../utils/compute-validation'

/**
 * Right-side panel state machine. Mutually exclusive — opening one closes the
 * other. Replaces the previous `isTestMode: boolean` to make room for the
 * in-editor execution-history panel (AAA-T-220).
 */
type RightPanel = 'none' | 'test' | 'history'

const WorkflowCanvas = lazy(() => import('./WorkflowCanvas'))

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

  const initialNodes: CanvasNodeData[] = buildInitialNodes(workflow, syntheticTriggerIdRef.current)
  const initialEdges: CanvasEdgeData[] = workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source_step_id,
    target: edge.target_step_id,
    sourceHandle: edge.condition_branch || undefined,
  }))
  const hasTriggerNode = initialNodes.some((n) => n.type === 'trigger')

  const canvasRef = useRef<WorkflowCanvasHandle>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [isActive, setIsActive] = useState(workflow.is_active)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // URL search — `?execution=<uuid>` controls auto-open of history-detail.
  // `replace: true` on every navigate prevents browser-history pollution from
  // panel toggles / row clicks.
  const search = useSearch({ from: '/admin/workflows/$workflowId' })
  const searchExecution = search.execution
  const navigate = useNavigate()

  // Right-side panel state. Initial value derives from URL so a deep link to
  // `?execution=...` opens the history panel directly with no mount-effect
  // sync (cleaner than a useEffect — avoids a one-frame flash of the wrong
  // panel state and dodges the hooks-deps eslint trap).
  const [rightPanel, setRightPanel] = useState<RightPanel>(searchExecution ? 'history' : 'none')

  // Cross-panel pre-fill (history → test). Set when user clicks "Kopiuj
  // payload" in the detail view; consumed by TestModePanel.initialJson when
  // the next mount happens. Reset on plain test toggle so re-opening test
  // doesn't keep showing a stale prefill from a previous copy action.
  const [testInitialJson, setTestInitialJson] = useState<string | undefined>(undefined)

  // Config panel state
  const [selectedNode, setSelectedNode] = useState<{
    id: string
    stepType: string
    stepConfig: Record<string, unknown>
    slug?: string
  } | null>(null)

  // --- URL helpers (centralized so transition rules stay in one place) ---
  function clearExecutionParam() {
    if (!searchExecution) return
    navigate({
      to: '/admin/workflows/$workflowId',
      params: { workflowId: workflow.id },
      search: (prev) => ({ ...prev, execution: undefined }),
      replace: true,
    })
  }

  function setExecutionParam(executionId: string) {
    navigate({
      to: '/admin/workflows/$workflowId',
      params: { workflowId: workflow.id },
      search: (prev) => ({ ...prev, execution: executionId }),
      replace: true,
    })
  }

  // --- Panel toggle handlers ---
  function handleTestPanelToggle() {
    setRightPanel((prev) => {
      const next = prev === 'test' ? 'none' : 'test'
      if (next === 'test') {
        setSelectedNode(null)
      }
      return next
    })
    // Plain toggle = user did not request a payload prefill; clear stale state.
    setTestInitialJson(undefined)
  }

  function handleHistoryPanelToggle() {
    setRightPanel((prev) => {
      const next = prev === 'history' ? 'none' : 'history'
      if (next === 'history') {
        setSelectedNode(null)
      } else {
        // Closing history MUST clear ?execution — keeps URL truthful: panel
        // gone ⇒ no detail to share. (Centralized rule per task spec.)
        clearExecutionParam()
      }
      return next
    })
  }

  // --- Bidirectional callbacks ---

  /**
   * History → Test. User clicks "Kopiuj payload" in execution-detail. Pre-fill
   * the test JSON editor, switch panels, and clear `?execution` since the
   * detail view is no longer visible (URL must reflect actual UI state).
   */
  function handleCopyPayloadToTest(payload: Record<string, unknown>) {
    setTestInitialJson(JSON.stringify(payload, null, 2))
    setRightPanel('test')
    clearExecutionParam()
  }

  /**
   * Test → History. After successful test dispatch in TestModePanel, swap to
   * the history panel and deep-link to the freshly-created execution. User
   * sees their running execution's progress immediately.
   */
  function handleRequestOpenHistory(executionId: string) {
    setTestInitialJson(undefined)
    setRightPanel('history')
    setExecutionParam(executionId)
  }

  /**
   * History list ↔ detail navigation inside the panel. `undefined` = back to
   * list (clears `?execution`); UUID = open detail (sets `?execution`).
   */
  function handleExecutionChange(executionId: string | undefined) {
    if (executionId === undefined) {
      clearExecutionParam()
    } else {
      setExecutionParam(executionId)
    }
  }

  function handleNodeSelect(
    nodeId: string | null,
    stepType: string,
    stepConfig: Record<string, unknown>,
  ) {
    // Mirror previous test-mode rule for ALL right-side panels: when a panel
    // is open, canvas node clicks are no-ops. Single rule beats per-panel
    // branching.
    if (rightPanel !== 'none') return
    if (!nodeId) {
      setSelectedNode(null)
      return
    }
    // Pull slug from the canvas node data — onNodeSelect doesn't ship it directly.
    const node = canvasRef.current?.getNodes().find((n) => n.id === nodeId)
    const slug = node ? ((node.data as { slug?: string }).slug ?? undefined) : undefined
    setSelectedNode({ id: nodeId, stepType, stepConfig, slug })
  }

  async function handleSlugCommit(
    newSlug: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
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
  }

  function handleConfigChange(config: Record<string, unknown>, triggerType?: TriggerType) {
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
  }

  function handlePanelClose() {
    setSelectedNode(null)
  }

  function handleDirtyChange(dirty: boolean) {
    setIsDirty(dirty)
  }

  async function handleSave() {
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
  }

  async function handleToggleActive(active: boolean) {
    setIsActive(active)
    const result = await toggleWorkflowActiveFn({ data: { id: workflow.id, isActive: active } })
    if (!result.success) {
      setIsActive(!active)
      console.error('Toggle failed:', result.error)
    }
  }

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

  // Re-derived every render. Plain expressions — React Compiler auto-memoizes.
  // The previous `isDirty` dep on these memos was a canvas-mutation proxy
  // forcing re-eval; without manual memoization every render recomputes
  // naturally, which is correct for state held outside React (`canvasRef`).
  // `isDirty` toggles trigger renders, so the linkage is preserved implicitly.
  const availableVariables = computeAvailableVariables(
    selectedNode,
    canvasRef.current,
    workflow.trigger_type,
  )
  const validation = computeValidation(canvasRef.current, selectedNode)
  const invalidStepIds = new Set(validation.errorsByStepId.keys())

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
              variant={rightPanel === 'test' ? 'default' : 'outline'}
              size="sm"
              onClick={handleTestPanelToggle}
              className="gap-1.5"
              aria-label={messages.workflows.testMode.toggle}
              aria-pressed={rightPanel === 'test'}
            >
              <FlaskConical className="h-4 w-4" />
              {messages.workflows.testMode.toggle}
            </Button>
            <Button
              variant={rightPanel === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={handleHistoryPanelToggle}
              className="gap-1.5"
              aria-label={messages.workflows.executionHistory.panelTitle}
              aria-pressed={rightPanel === 'history'}
            >
              <History className="h-4 w-4" />
              {messages.workflows.executionHistory.panelTitle}
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
        {rightPanel === 'test' && (
          <TestModePanel
            workflowId={workflow.id}
            triggerType={workflow.trigger_type}
            isActive={isActive}
            onClose={handleTestPanelToggle}
            initialJson={testInitialJson}
            onRequestOpenHistory={handleRequestOpenHistory}
          />
        )}
        {rightPanel === 'history' && (
          <ExecutionHistoryPanel
            workflowId={workflow.id}
            executionId={searchExecution}
            onExecutionChange={handleExecutionChange}
            onClose={handleHistoryPanelToggle}
            onCopyPayloadToTest={handleCopyPayloadToTest}
          />
        )}
        {rightPanel === 'none' && selectedNode && PanelComponent && (
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
        )}
      </div>
    </div>
  )
}
