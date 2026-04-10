'use client'

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Zap, Trash2, Play } from 'lucide-react'
import { dryRunSingleStep } from '../actions'
import { messages } from '@/lib/messages'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { ConditionNode } from './nodes/ConditionNode'
import { DelayNode } from './nodes/DelayNode'
import { NODE_TYPE_CONFIGS } from './nodes/node-registry'
import { CanvasControls } from './CanvasControls'
import { AddNodeDropdown } from './AddNodeDropdown'

/** Component map keyed by node type — components resolved from registry keys */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ReactFlow node components have varying prop types
const NODE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  trigger: TriggerNode,
  send_email: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  webhook: ActionNode,
  ai_action: ActionNode,
}

const nodeTypes = Object.fromEntries(
  Object.keys(NODE_TYPE_CONFIGS).map((key) => [key, NODE_COMPONENTS[key]])
)

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
}

/** Plain data object without reactflow-specific properties */
export interface CanvasNodeData {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  deletable?: boolean
}

export interface CanvasEdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

export interface WorkflowCanvasHandle {
  getNodes: () => CanvasNodeData[]
  getEdges: () => CanvasEdgeData[]
  resetDirty: () => void
  updateNodeData: (nodeId: string, newData: Record<string, unknown>) => void
}

export type TestResultStatus = 'completed' | 'failed' | 'skipped' | 'pending'

interface TestResult {
  stepId: string
  status: TestResultStatus
}

interface WorkflowCanvasProps {
  workflowId: string
  initialNodes: CanvasNodeData[]
  initialEdges: CanvasEdgeData[]
  onDirtyChange: (isDirty: boolean) => void
  onNodeSelect?: (nodeId: string | null, stepType: string, stepConfig: Record<string, unknown>) => void
  hasTriggerNode: boolean
  triggerType: string
  getLabel: (stepType: string) => string
  testResults?: TestResult[]
}

function CanvasInner(
  {
    workflowId,
    initialNodes,
    initialEdges,
    onDirtyChange,
    onNodeSelect,
    hasTriggerNode: initialHasTrigger,
    triggerType,
    getLabel,
    testResults,
  }: WorkflowCanvasProps,
  ref: React.Ref<WorkflowCanvasHandle>
) {
  const rfNodes = useMemo<Node[]>(
    () =>
      initialNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        deletable: n.deletable,
      })),
    [initialNodes]
  )

  const rfEdges = useMemo<Edge[]>(
    () =>
      initialEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        sourceHandle: e.sourceHandle,
      })),
    [initialEdges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)
  const { screenToFlowPosition } = useReactFlow()

  const initialRef = useRef(JSON.stringify({ nodes: initialNodes, edges: initialEdges }))

  const isDirty = useMemo(
    () => {
      const current = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        deletable: n.deletable,
      }))
      const currentEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }))
      return JSON.stringify({ nodes: current, edges: currentEdges }) !== initialRef.current
    },
    [nodes, edges]
  )

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Apply test result status to nodes
  useEffect(() => {
    if (!testResults?.length) {
      // Clear execution status from all nodes
      setNodes((nds) =>
        nds.map((n) => {
          const data = n.data as Record<string, unknown>
          if (data.executionStatus) {
            return { ...n, data: { ...data, executionStatus: undefined } }
          }
          return n
        })
      )
      return
    }

    const statusMap = new Map(testResults.map((r) => [r.stepId, r.status]))
    setNodes((nds) =>
      nds.map((n) => {
        const status = statusMap.get(n.id)
        return {
          ...n,
          data: { ...(n.data as Record<string, unknown>), executionStatus: status },
        }
      })
    )
  }, [testResults, setNodes])

  const hasTrigger = useMemo(
    () => nodes.some((n) => n.type === 'trigger'),
    [nodes]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds))
    },
    [setEdges]
  )

  const onAddNode = useCallback(
    (stepType: string) => {
      if (stepType === 'trigger' && hasTrigger) return

      const id = crypto.randomUUID()
      // Horizontal layout: spread nodes to the right with slight vertical offset
      const baseX = 100 + nodes.length * 280
      const baseY = 150 + (nodes.length % 3) * 100

      const isTrigger = stepType === 'trigger'
      const actualType = isTrigger ? triggerType : stepType

      const newNode: Node = {
        id,
        type: isTrigger ? 'trigger' : stepType,
        position: { x: baseX, y: baseY },
        deletable: isTrigger ? false : undefined,
        data: {
          label: getLabel(actualType),
          stepType: actualType,
          stepConfig: { type: actualType },
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [hasTrigger, nodes.length, setNodes, triggerType, getLabel]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const stepType = event.dataTransfer.getData('application/workflow-step')
      if (!stepType || stepType === 'trigger') return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const id = crypto.randomUUID()
      const newNode: Node = {
        id,
        type: stepType,
        position,
        data: {
          label: getLabel(stepType),
          stepType,
          stepConfig: { type: stepType },
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, getLabel, screenToFlowPosition]
  )

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)

  // Single step run state
  const [singleStepRun, setSingleStepRun] = useState<{
    stepId: string
    stepLabel: string
  } | null>(null)
  const [singleStepInput, setSingleStepInput] = useState('{}')
  const [singleStepRunning, setSingleStepRunning] = useState(false)
  const [singleStepResult, setSingleStepResult] = useState<{
    status: string
    outputPayload: Record<string, unknown> | null
    errorMessage?: string
  } | null>(null)

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      // Allow context menu for test mode (run step) even on non-deletable nodes
      if (node.deletable === false && !testResults?.length) return
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    [testResults]
  )

  // Close context menu on click-away or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu])

  // Node click handler — propagates selection to parent
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as Record<string, unknown>
      onNodeSelect?.(node.id, data.stepType as string, data.stepConfig as Record<string, unknown> ?? {})
    },
    [onNodeSelect]
  )

  // Pane click handler — deselects and closes context menu
  const onPaneClick = useCallback(() => {
    setContextMenu(null)
    onNodeSelect?.(null, '', {})
  }, [onNodeSelect])

  // Expose current state to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      getNodes: () =>
        nodes.map((n) => ({
          id: n.id,
          type: n.type ?? 'unknown',
          position: n.position,
          data: n.data as Record<string, unknown>,
          deletable: n.deletable,
        })),
      getEdges: () =>
        edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
        })),
      resetDirty: () => {
        const currentNodes = nodes.map((n) => ({
          id: n.id,
          type: n.type ?? 'unknown',
          position: n.position,
          data: n.data as Record<string, unknown>,
          deletable: n.deletable,
        }))
        const currentEdges = edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
        }))
        initialRef.current = JSON.stringify({ nodes: currentNodes, edges: currentEdges })
      },
      updateNodeData: (nodeId: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== nodeId) return n
            return {
              ...n,
              data: {
                ...(n.data as Record<string, unknown>),
                ...newData,
              },
            }
          })
        )
      },
    }),
    [nodes, edges, setNodes]
  )

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <AddNodeDropdown onAddNode={onAddNode} hasTrigger={hasTrigger} />
      <CanvasControls />
      {/* Empty state hint when no trigger node exists */}
      {!hasTrigger && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Zap className="h-8 w-8" />
            <p className="text-sm">{messages.workflows.editor.addTriggerHint}</p>
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {testResults?.length && (
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                const node = nodes.find((n) => n.id === contextMenu.nodeId)
                const label = (node?.data as Record<string, unknown>)?.label as string ?? contextMenu.nodeId
                setSingleStepRun({ stepId: contextMenu.nodeId, stepLabel: label })
                setSingleStepInput('{}')
                setSingleStepResult(null)
                setContextMenu(null)
              }}
            >
              <Play className="h-4 w-4" />
              {messages.workflows.testMode.runStep}
            </button>
          )}
          {nodes.find((n) => n.id === contextMenu.nodeId)?.deletable !== false && (
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setNodes((nds) => nds.filter((n) => n.id !== contextMenu.nodeId))
                setEdges((eds) =>
                  eds.filter(
                    (e) => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId
                  )
                )
                setContextMenu(null)
                onNodeSelect?.(null, '', {})
              }}
            >
              <Trash2 className="h-4 w-4" />
              {messages.workflows.editor.deleteStep}
            </button>
          )}
        </div>
      )}
      {/* Single step run dialog */}
      {singleStepRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[480px] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
            <h3 className="text-sm font-semibold mb-3">
              {messages.workflows.testMode.runStep}: {singleStepRun.stepLabel}
            </h3>
            <label className="text-xs text-muted-foreground mb-1 block">
              {messages.workflows.testMode.stepInputData}
            </label>
            <textarea
              className="w-full h-32 rounded-md border bg-background p-2 text-sm font-mono mb-3"
              value={singleStepInput}
              onChange={(e) => setSingleStepInput(e.target.value)}
            />
            <div className="flex gap-2 mb-3">
              <button
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                disabled={singleStepRunning}
                onClick={async () => {
                  let parsed: Record<string, unknown>
                  try {
                    parsed = JSON.parse(singleStepInput)
                  } catch {
                    setSingleStepResult({ status: 'failed', outputPayload: null, errorMessage: messages.workflows.testMode.invalidJson })
                    return
                  }
                  setSingleStepRunning(true)
                  setSingleStepResult(null)
                  try {
                    const result = await dryRunSingleStep(workflowId, singleStepRun.stepId, parsed)
                    if (result.success && result.data) {
                      setSingleStepResult(result.data)
                    } else {
                      setSingleStepResult({ status: 'failed', outputPayload: null, errorMessage: result.error })
                    }
                  } catch (err) {
                    setSingleStepResult({ status: 'failed', outputPayload: null, errorMessage: err instanceof Error ? err.message : 'Unknown error' })
                  } finally {
                    setSingleStepRunning(false)
                  }
                }}
              >
                {singleStepRunning ? messages.workflows.testMode.running : messages.workflows.testMode.runStepButton}
              </button>
              <button
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
                onClick={() => setSingleStepRun(null)}
              >
                {messages.workflows.editor.configPanelClose}
              </button>
            </div>
            {singleStepResult && (
              <div className={`rounded-md border p-3 text-sm ${singleStepResult.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-destructive/20 bg-destructive/10'}`}>
                <p className="font-medium mb-1">
                  {singleStepResult.status === 'completed' ? messages.workflows.testMode.stepRunCompleted : messages.workflows.testMode.stepRunFailed}
                </p>
                {singleStepResult.errorMessage && (
                  <p className="text-xs text-muted-foreground mb-1">{singleStepResult.errorMessage}</p>
                )}
                {singleStepResult.outputPayload && (
                  <pre className="text-xs font-mono mt-1 overflow-auto max-h-32">
                    {JSON.stringify(singleStepResult.outputPayload, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CanvasInnerWithRef = forwardRef(CanvasInner)

const WorkflowCanvas = forwardRef(function WorkflowCanvas(
  props: WorkflowCanvasProps,
  ref: React.Ref<WorkflowCanvasHandle>
) {
  return (
    <ReactFlowProvider>
      <CanvasInnerWithRef ref={ref} {...props} />
    </ReactFlowProvider>
  )
})

export default WorkflowCanvas
