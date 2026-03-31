import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { nodeBaseClasses, selectedClasses, borderColors, nodeIcons } from './node-styles'
import { NODE_TYPE_CONFIGS } from './node-registry'

export type ActionNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
}

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData
  const Icon = nodeIcons[nodeData.stepType]
  const borderClass = borderColors[nodeData.stepType] ?? 'border-l-4 border-l-blue-400'

  return (
    <div
      className={`${nodeBaseClasses} ${borderClass} ${selected ? selectedClasses : ''}`}
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
            {NODE_TYPE_CONFIGS[nodeData.stepType]?.label ?? nodeData.stepType}
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

export const ActionNode = memo(ActionNodeComponent)
