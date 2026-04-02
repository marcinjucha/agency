import { Badge } from '@agency/ui'
import { LISTING_STATUS_LABELS } from '../types'
import type { ListingStatus } from '../types'

const STATUS_STYLES: Record<ListingStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  draft: 'bg-muted text-muted-foreground border-border',
  publishing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sold: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  removed: 'bg-muted text-muted-foreground border-border',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
}

type ListingStatusBadgeProps = {
  status: ListingStatus
}

export function ListingStatusBadge({ status }: ListingStatusBadgeProps) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  )
}
