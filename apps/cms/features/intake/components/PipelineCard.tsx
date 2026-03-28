'use client'

import { forwardRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@agency/ui'
import { Calendar } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { PipelineResponse, ClosedSubStatus, CLOSED_SUB_STATUSES } from '../types'

interface PipelineCardProps {
  response: PipelineResponse
  onClick: () => void
}

/** Sub-status badge label mapping */
const SUB_STATUS_LABELS: Record<ClosedSubStatus, string> = {
  client: messages.intake.badgeClient,
  rejected: messages.intake.badgeRejected,
  disqualified: messages.intake.badgeDisqualified,
}

/** Sub-status badge variant mapping */
const SUB_STATUS_VARIANTS: Record<ClosedSubStatus, 'default' | 'secondary' | 'destructive'> = {
  client: 'default',
  rejected: 'destructive',
  disqualified: 'secondary',
}

const CLOSED_STATUSES: readonly string[] = ['client', 'rejected', 'disqualified']

/**
 * Format relative time ago in Polish shorthand.
 * <1h = "Xmin", <24h = "Xh", <7d = "Xd", else "Xtyg"
 */
function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  const weeks = Math.floor(days / 7)

  if (minutes < 60) return `${Math.max(1, minutes)}min ${messages.intake.pipelineCardTimeAgo}`
  if (hours < 24) return `${hours}h ${messages.intake.pipelineCardTimeAgo}`
  if (days < 7) return `${days}d ${messages.intake.pipelineCardTimeAgo}`
  return `${weeks}tyg ${messages.intake.pipelineCardTimeAgo}`
}

/** AI score color: green 8-10, amber 5-7, red 0-4 */
function getScoreColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}

interface PipelineCardContentProps {
  response: PipelineResponse
  onClick?: () => void
  isDragging?: boolean
  style?: React.CSSProperties
}

/**
 * Card content as forwardRef for DragOverlay reuse.
 * Separated from drag wrapper so DragOverlay can render the same visual.
 */
export const PipelineCardContent = forwardRef<HTMLDivElement, PipelineCardContentProps>(
  function PipelineCardContent({ response, onClick, isDragging, style, ...props }, ref) {
    const isClosedSubStatus = CLOSED_STATUSES.includes(response.status)

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={`bg-card rounded-md border shadow-sm p-3 cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity ${
          isDragging ? 'opacity-50' : ''
        }`}
        style={style}
        aria-label={`${response.clientName}, ${response.surveyTitle}`}
        {...props}
      >
        {/* Row 1: Name + AI score */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-foreground truncate">
            {response.clientName}
          </span>
          {response.aiScore !== null && (
            <span
              className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${getScoreColor(response.aiScore)}`}
              aria-label={`AI score: ${response.aiScore}`}
            >
              {response.aiScore}
            </span>
          )}
        </div>

        {/* Row 2: Survey title */}
        <p className="text-xs text-muted-foreground truncate mt-1">
          {response.surveyTitle}
        </p>

        {/* Row 3: Time ago + appointment + sub-status */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{formatTimeAgo(response.createdAt)}</span>

          {response.hasAppointment && (
            <Calendar className="h-3 w-3 text-muted-foreground" aria-label="Ma wizytę" />
          )}

          {isClosedSubStatus && (
            <Badge
              variant={SUB_STATUS_VARIANTS[response.status as ClosedSubStatus]}
              className="text-[10px] px-1.5 py-0"
            >
              {SUB_STATUS_LABELS[response.status as ClosedSubStatus]}
            </Badge>
          )}
        </div>
      </div>
    )
  }
)

export function PipelineCard({ response, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: response.id,
    data: { response },
  })

  return (
    <PipelineCardContent
      ref={setNodeRef}
      response={response}
      onClick={onClick}
      isDragging={isDragging}
      {...listeners}
      {...attributes}
    />
  )
}
