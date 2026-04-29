import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertTriangle } from 'lucide-react'
import { messages } from '@/lib/messages'
import { nodeBaseClasses, selectedClasses } from './node-styles'
import { lookupNodeConfig } from './node-registry'

export type ActionNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
  executionStatus?: 'completed' | 'failed' | 'skipped' | 'pending'
  isInvalid?: boolean
}

const EXECUTION_RING: Record<string, string> = {
  completed: 'ring-2 ring-emerald-500/60',
  failed: 'ring-2 ring-red-500/60',
  skipped: 'opacity-40',
}

const INVALID_RING = 'ring-2 ring-amber-500'

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData
  const config = lookupNodeConfig(nodeData.stepType)
  const Icon = config?.icon
  const borderClass = config?.borderColor ?? 'border-l-4 border-l-blue-400'
  // Invalid takes precedence over selection so users see the validation cue while editing.
  const ring = nodeData.isInvalid
    ? INVALID_RING
    : nodeData.executionStatus
      ? EXECUTION_RING[nodeData.executionStatus] ?? ''
      : selected
        ? selectedClasses
        : ''

  return (
    <div
      className={`${nodeBaseClasses} ${borderClass} ${ring}`}
      aria-invalid={nodeData.isInvalid ? 'true' : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
      />
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-blue-400 shrink-0" />}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {lookupNodeConfig(nodeData.stepType)?.label ?? nodeData.stepType}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
        {nodeData.isInvalid && (
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-500 shrink-0 ml-auto"
            aria-label={messages.workflows.editor.invalidStepAriaLabel}
          />
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
      />
    </div>
  )
}

export const ActionNode = memo(ActionNodeComponent)
