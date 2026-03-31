import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { nodeBaseClasses, selectedClasses, borderColors } from './node-styles'

export type TriggerNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
}

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData
  const borderClass = borderColors[nodeData.stepType] ?? borderColors.trigger

  return (
    <div
      className={`${nodeBaseClasses} ${borderClass} ${selected ? selectedClasses : ''}`}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-orange-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Wyzwalacz
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-orange-500 !border-orange-600 !w-2.5 !h-2.5"
      />
    </div>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
