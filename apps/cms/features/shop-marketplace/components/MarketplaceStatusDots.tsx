import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@agency/ui'
import { MARKETPLACE_LABELS, LISTING_STATUS_LABELS } from '../types'
import type { MarketplaceListing, MarketplaceId } from '../types'

// Dot color per listing status
function getDotClass(status: MarketplaceListing['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500'
    case 'publishing':
      return 'bg-blue-500'
    case 'error':
    case 'expired':
      return 'bg-amber-500'
    case 'sold':
    case 'removed':
    case 'draft':
    default:
      return 'bg-muted-foreground/40'
  }
}

interface MarketplaceStatusDotsProps {
  /** All listings for this product (already filtered client-side) */
  listings: MarketplaceListing[]
  /** Connected marketplace IDs to show dots for even when no listing exists */
  connectedMarketplaces: MarketplaceId[]
}

/**
 * Compact inline marketplace status indicators for product cards/rows.
 * Shows a colored dot per marketplace platform:
 *   • Emerald  = active listing
 *   • Blue     = publishing in progress
 *   • Amber    = error or expired
 *   • Muted    = no listing for this marketplace
 */
export function MarketplaceStatusDots({ listings, connectedMarketplaces }: MarketplaceStatusDotsProps) {
  if (connectedMarketplaces.length === 0) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5" aria-label="Status marketplace">
        {connectedMarketplaces.map((marketplace) => {
          const listing = listings.find((l) => l.marketplace === marketplace)
          const label = MARKETPLACE_LABELS[marketplace]
          const statusLabel = listing ? LISTING_STATUS_LABELS[listing.status] : 'Brak ogłoszenia'
          const dotClass = listing ? getDotClass(listing.status) : 'bg-muted-foreground/30'
          const ariaLabel = `Status ${label}: ${statusLabel}`

          return (
            <Tooltip key={marketplace}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default" aria-label={ariaLabel}>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] leading-none text-muted-foreground font-medium">
                    {label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>
                  <span className="font-medium">{label}:</span> {statusLabel}
                </p>
                {listing?.last_sync_error && (
                  <p className="mt-0.5 text-destructive/80 max-w-[200px] break-words">
                    {listing.last_sync_error}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
