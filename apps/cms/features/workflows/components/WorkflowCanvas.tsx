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
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Zap } from 'lucide-react'
import { messages } from '@/lib/messages'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { ConditionNode } from './nodes/ConditionNode'
import { DelayNode } from './nodes/DelayNode'
import { NODE_TYPE_CONFIGS } from './nodes/node-registry'
import { CanvasControls } from './CanvasControls'
import { AddNodeDropdown } from './AddNodeDropdown'

/** Component map keyed by node type — components resolved from registry keys */
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

interface WorkflowCanvasProps {
  initialNodes: CanvasNodeData[]
  initialEdges: CanvasEdgeData[]
  onDirtyChange: (isDirty: boolean) => void
  onNodeSelect?: (nodeId: string | null, stepType: string, stepConfig: Record<string, unknown>) => void
  hasTriggerNode: boolean
  triggerType: string
  getLabel: (stepType: string) => string
}

function CanvasInner(
  {
    initialNodes,
    initialEdges,
    onDirtyChange,
    onNodeSelect,
    hasTriggerNode: initialHasTrigger,
    triggerType,
    getLabel,
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

  // Node click handler — propagates selection to parent
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as Record<string, unknown>
      onNodeSelect?.(node.id, data.stepType as string, data.stepConfig as Record<string, unknown> ?? {})
    },
    [onNodeSelect]
  )

  // Pane click handler — deselects
  const onPaneClick = useCallback(() => {
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
