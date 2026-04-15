

import { Badge } from '@agency/ui'
import { messages } from '@/lib/messages'
import { getListingTypeLabel } from '../utils'
import type { ListingType } from '../types'

export function StatusBadge({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      >
        {messages.shop.statusPublished}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-[11px] bg-muted text-muted-foreground border-border"
    >
      {messages.shop.statusDraft}
    </Badge>
  )
}

export function ListingTypeBadge({ listingType }: { listingType: ListingType }) {
  const label = getListingTypeLabel(listingType)

  if (listingType === 'external_link') {
    return (
      <Badge
        variant="outline"
        className="text-[11px] bg-blue-500/10 text-blue-400 border-blue-500/20"
      >
        {label}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-[11px] bg-purple-500/10 text-purple-400 border-purple-500/20"
    >
      {label}
    </Badge>
  )
}
