import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { nodeBaseClasses, selectedClasses, borderColors } from './node-styles'
import { messages } from '@/lib/messages'

export type ConditionNodeData = {
  label: string
  stepType: string
  stepConfig: Record<string, unknown>
}

function ConditionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData

  return (
    <div
      className={`${nodeBaseClasses} ${borderColors.condition} ${selected ? selectedClasses : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
      />
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {messages.workflows.stepCondition}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
      </div>
      {/* Yes/No labels positioned on the right edge */}
      <div className="absolute right-[-24px] top-0 bottom-0 flex flex-col justify-around text-xs text-muted-foreground">
        <span>{messages.workflows.editor.conditionYes}</span>
        <span>{messages.workflows.editor.conditionNo}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!bg-emerald-500 !border-emerald-600 !w-2.5 !h-2.5 !top-[33%]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!bg-red-500 !border-red-600 !w-2.5 !h-2.5 !top-[67%]"
      />
    </div>
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
