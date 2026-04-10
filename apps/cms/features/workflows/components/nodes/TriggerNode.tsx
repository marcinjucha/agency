import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { messages } from '@/lib/messages'
import { nodeBaseClasses, selectedClasses, borderColors } from './node-styles'

export type TriggerNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
  executionStatus?: 'completed' | 'failed' | 'skipped' | 'pending'
}

const EXECUTION_RING: Record<string, string> = {
  completed: 'ring-2 ring-emerald-500/60',
  failed: 'ring-2 ring-red-500/60',
  skipped: 'opacity-40',
}

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData
  const borderClass = borderColors[nodeData.stepType] ?? borderColors.trigger
  const execRing = nodeData.executionStatus ? EXECUTION_RING[nodeData.executionStatus] ?? '' : ''

  return (
    <div
      className={`${nodeBaseClasses} ${borderClass} ${selected ? selectedClasses : ''} ${execRing}`}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-orange-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {messages.workflows.editor.trigger}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-orange-500 !border-orange-600 !w-2.5 !h-2.5"
      />
    </div>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
