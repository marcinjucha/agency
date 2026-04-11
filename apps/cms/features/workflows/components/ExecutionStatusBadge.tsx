import { Badge } from '@agency/ui'
import { EXECUTION_STATUS_LABELS } from '../types'
import type { ExecutionStatus } from '../types'
import { cn } from '@agency/ui'

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus
  className?: string
}

const STATUS_CLASSES: Record<ExecutionStatus, string> = {
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  running:   'border-blue-500/30 bg-blue-500/10 text-blue-400',
  pending:   'border-border bg-muted/50 text-muted-foreground',
  failed:    'border-red-500/30 bg-red-500/10 text-red-400',
  cancelled: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  paused:     'border-amber-500/30 bg-amber-500/10 text-amber-400',
}

const DOT_CLASSES: Record<ExecutionStatus, string> = {
  completed: 'bg-emerald-400',
  running:   'bg-blue-400',
  pending:   'bg-muted-foreground',
  failed:    'bg-red-400',
  cancelled: 'bg-orange-400',
  paused:     'bg-amber-400',
}

export function ExecutionStatusBadge({ status, className }: ExecutionStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-normal',
        STATUS_CLASSES[status],
        className
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_CLASSES[status])}
        aria-hidden="true"
      />
      {EXECUTION_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
