import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@agency/ui'
import { PipelineCard } from './PipelineCard'
import type { PipelineColumnConfig, PipelineResponse } from '../types'

interface PipelineColumnProps {
  column: PipelineColumnConfig
  responses: PipelineResponse[]
  onCardClick: (response: PipelineResponse) => void
}

export function PipelineColumn({ column, responses, onCardClick }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] bg-muted/50 rounded-lg border p-3 transition-colors ${
        isOver ? 'border-primary/50 bg-muted/80' : ''
      }`}
      aria-label={`${column.label} — ${responses.length}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">{column.label}</h3>
        <Badge variant="secondary" className="text-xs">
          {responses.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
        {responses.map((response) => (
          <PipelineCard
            key={response.id}
            response={response}
            onClick={() => onCardClick(response)}
          />
        ))}
      </div>
    </div>
  )
}
