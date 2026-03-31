import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import { nodeBaseClasses, selectedClasses, borderColors } from './node-styles'
import { messages } from '@/lib/messages'

export type DelayNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
}

function DelayNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DelayNodeData

  return (
    <div
      className={`${nodeBaseClasses} ${borderColors.delay} ${selected ? selectedClasses : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
      />
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {messages.workflows.stepDelay}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
      />
    </div>
  )
}

export const DelayNode = memo(DelayNodeComponent)
