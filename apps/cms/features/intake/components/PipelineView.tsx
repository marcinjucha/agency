import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateResponseStatusFn } from '../server'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { PipelineColumn } from './PipelineColumn'
import { PipelineCardContent } from './PipelineCard'
import { SortDropdown } from './SortDropdown'
import {
  STATUS_TO_COLUMN,
  type PipelineResponse,
  type PipelineColumnId,
  type PipelineColumnConfig,
  type PipelineSortOption,
  type ResponseStatus,
} from '../types'

/** Column config with labels from messages */
const COLUMNS: PipelineColumnConfig[] = [
  { id: 'new', label: messages.intake.columnNew, statuses: ['new'] },
  { id: 'qualified', label: messages.intake.columnQualified, statuses: ['qualified'] },
  { id: 'contacted', label: messages.intake.columnContacted, statuses: ['contacted'] },
  { id: 'closed', label: messages.intake.columnClosed, statuses: ['disqualified', 'client', 'rejected'] },
]

/** Map column drop target to the primary DB status */
const COLUMN_TO_DEFAULT_STATUS: Record<PipelineColumnId, ResponseStatus> = {
  new: 'new',
  qualified: 'qualified',
  contacted: 'contacted',
  closed: 'client',
}

interface PipelineViewProps {
  responses: PipelineResponse[]
  onSelectResponse: (response: PipelineResponse) => void
}

export function PipelineView({ responses, onSelectResponse }: PipelineViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const [sortOption, setSortOption] = useState<PipelineSortOption>('newest')
  const [activeId, setActiveId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: async ({ responseId, newStatus }: { responseId: string; newStatus: string }) => {
      const result = await updateResponseStatusFn({ data: { responseId, status: newStatus } })
      if (!result.success) throw new Error(result.error)
      return result
    },
  })

  /** Sort responses based on selected option */
  const sortResponses = useCallback(
    (items: PipelineResponse[]): PipelineResponse[] => {
      const sorted = [...items]
      switch (sortOption) {
        case 'newest':
          return sorted.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        case 'ai_score':
          return sorted.sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1))
        case 'name':
          return sorted.sort((a, b) => a.clientName.localeCompare(b.clientName, 'pl'))
        default:
          return sorted
      }
    },
    [sortOption]
  )

  /** Group responses into columns */
  const columnData = useMemo(() => {
    const grouped: Record<PipelineColumnId, PipelineResponse[]> = {
      new: [],
      qualified: [],
      contacted: [],
      closed: [],
    }

    for (const response of responses) {
      const columnId = STATUS_TO_COLUMN[response.status] ?? 'new'
      grouped[columnId].push(response)
    }

    // Sort each column
    for (const key of Object.keys(grouped) as PipelineColumnId[]) {
      grouped[key] = sortResponses(grouped[key])
    }

    return grouped
  }, [responses, sortResponses])

  /** Active card for DragOverlay */
  const activeResponse = useMemo(
    () => (activeId ? responses.find((r) => r.id === activeId) ?? null : null),
    [activeId, responses]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)

      const { active, over } = event
      if (!over) return

      const responseId = active.id as string
      const targetColumnId = over.id as PipelineColumnId

      // Find the response being dragged
      const response = responses.find((r) => r.id === responseId)
      if (!response) return

      // Check if it actually moved to a different column
      const sourceColumnId = STATUS_TO_COLUMN[response.status]
      if (sourceColumnId === targetColumnId) return

      const targetStatus = COLUMN_TO_DEFAULT_STATUS[targetColumnId]

      // Optimistic update
      queryClient.setQueryData<PipelineResponse[]>(
        queryKeys.intake.pipeline,
        (old) => {
          if (!old) return old
          return old.map((r) =>
            r.id === responseId ? { ...r, status: targetStatus } : r
          )
        }
      )

      // Fire mutation
      statusMutation.mutate({ responseId, newStatus: targetStatus })
    },
    [responses, queryClient, statusMutation]
  )

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex justify-end">
        <SortDropdown value={sortOption} onChange={setSortOption} />
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => (
            <PipelineColumn
              key={column.id}
              column={column}
              responses={columnData[column.id]}
              onCardClick={onSelectResponse}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeResponse ? (
            <PipelineCardContent response={activeResponse} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
