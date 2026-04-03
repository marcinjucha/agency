'use client'

import Image from 'next/image'
import { Badge, Checkbox } from '@agency/ui'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { ShoppingBag, AlertCircle } from 'lucide-react'
import { messages } from '@/lib/messages'
import { LISTING_STATUS_LABELS } from '../types'
import type { ImportPreviewListing } from '../actions.import'

type ImportPreviewTableProps = {
  listings: ImportPreviewListing[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  isLoading?: boolean
  error?: string | null
  capped?: boolean
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(price)
}

function ThumbnailCell({ images, title }: { images: string[]; title: string }) {
  const src = images[0]
  if (!src) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
        <ShoppingBag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
      <Image
        src={src}
        alt={title}
        fill
        className="object-cover"
        sizes="48px"
        unoptimized
      />
    </div>
  )
}

export function ImportPreviewTable({
  listings,
  selectedIds,
  onToggle,
  onToggleAll,
  isLoading,
  error,
  capped,
}: ImportPreviewTableProps) {
  if (isLoading) {
    return <LoadingState variant="skeleton-table" rows={6} />
  }

  if (error) {
    return (
      <ErrorState
        title={messages.marketplace.importLoadError}
        message={error}
      />
    )
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={messages.marketplace.importNoListings}
        description={messages.marketplace.importNoListingsDescription}
      />
    )
  }

  const allSelected = listings.length > 0 && listings.every((l) => selectedIds.has(l.externalListingId))
  const someSelected = listings.some((l) => selectedIds.has(l.externalListingId))

  return (
    <div className="space-y-3">
      {/* Counter + cap info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {messages.marketplace.importSelectedCount(selectedIds.size, listings.length)}
        </p>
        {capped && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <p className="text-xs text-amber-400">
              {messages.marketplace.importCappedInfo(listings.length)}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-md border border-border"
        tabIndex={0}
        role="region"
        aria-label="Tabela ogłoszeń do importu"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  aria-checked={someSelected && !allSelected ? 'mixed' : allSelected}
                  onCheckedChange={onToggleAll}
                  aria-label={allSelected
                    ? messages.marketplace.importDeselectAll
                    : messages.marketplace.importSelectAll}
                />
              </th>
              <th className="w-16 px-2 py-3" aria-hidden="true" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {messages.marketplace.importColumnTitle}
              </th>
              <th className="w-36 px-4 py-3 text-right font-medium text-muted-foreground">
                {messages.marketplace.importColumnPrice}
              </th>
              <th className="hidden w-36 px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                {messages.marketplace.importColumnStatus}
              </th>
              <th className="w-36 px-4 py-3 text-left font-medium text-muted-foreground">
                {messages.marketplace.importColumnDuplicate}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listings.map((listing) => {
              const isSelected = selectedIds.has(listing.externalListingId)
              return (
                <tr
                  key={listing.externalListingId}
                  onClick={() => onToggle(listing.externalListingId)}
                  className={[
                    'cursor-pointer transition-colors',
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                  ].join(' ')}
                >
                  {/* Checkbox */}
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(listing.externalListingId)}
                      aria-label={`Zaznacz "${listing.title}"`}
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-2 py-3">
                    <ThumbnailCell images={listing.images} title={listing.title} />
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <p className="line-clamp-2 font-medium text-foreground">
                      {listing.title}
                    </p>
                    {listing.externalUrl && (
                      <a
                        href={listing.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Otwórz ogłoszenie "${listing.title}" w nowej karcie`}
                      >
                        #{listing.externalListingId}
                      </a>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-foreground">
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                  </td>

                  {/* Status — hidden on mobile.
                      Always "Aktywne" because marketplace APIs (OLX/Allegro)
                      only return live listings in their import endpoints. */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    >
                      {LISTING_STATUS_LABELS.active}
                    </Badge>
                  </td>

                  {/* Duplicate flag */}
                  <td className="px-4 py-3">
                    {listing.already_imported && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                      >
                        {messages.marketplace.importDuplicateBadge}
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
