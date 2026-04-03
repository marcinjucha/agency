'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CollapsibleCard,
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import {
  Store,
  ShoppingBag,
  Upload,
  RefreshCw,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { differenceInDays, addDays } from 'date-fns'
import { queryKeys } from '@/lib/query-keys'
import { messages, templates } from '@/lib/messages'
import { getMarketplaceConnections, getMarketplaceListings } from '../queries'
import { publishToMarketplace, updateMarketplaceListing, removeMarketplaceListing } from '../actions'
import { MARKETPLACE_LABELS } from '../types'
import type { MarketplaceConnection, MarketplaceListing, MarketplaceId } from '../types'
import { ListingStatusBadge } from './ListingStatusBadge'
import { CategorySelector } from './CategorySelector'
import { LocationSelector } from './LocationSelector'

// --- Types ---

interface MarketplacePublishPanelProps {
  productId: string | null
}

interface ListingFormState {
  categoryId: string
  categoryName: string
  city: string
}

const EMPTY_FORM: ListingFormState = { categoryId: '', categoryName: '', city: '' }

// --- Polling interval for publishing/removing states ---
const POLL_INTERVAL_MS = 5000

// --- Marketplace icon map ---
const MARKETPLACE_ICONS: Record<MarketplaceId, React.ElementType> = {
  olx: Store,
  allegro: ShoppingBag,
}

// --- Per-marketplace section ---

interface MarketplaceSectionProps {
  connection: MarketplaceConnection
  listing: MarketplaceListing | undefined
  productId: string
  onPublish: (connectionId: string, form: ListingFormState) => Promise<void>
  onUpdate: (listingId: string, form: ListingFormState) => Promise<void>
  onRemove: (listingId: string) => Promise<void>
  publishPending: boolean
  updatePending: string | null  // listingId being updated
  removePending: string | null  // listingId being removed
}

function MarketplaceSection({
  connection,
  listing,
  productId,
  onPublish,
  onUpdate,
  onRemove,
  publishPending,
  updatePending,
  removePending,
}: MarketplaceSectionProps) {
  const Icon = MARKETPLACE_ICONS[connection.marketplace] ?? Store
  const label = MARKETPLACE_LABELS[connection.marketplace]
  const marketplace = connection.marketplace
  const isOlx = marketplace === 'olx'

  const [form, setForm] = useState<ListingFormState>(() => {
    // Pre-fill from existing listing if available
    if (listing) {
      const loc = listing.marketplace_location as Record<string, string> | null
      return {
        categoryId: listing.marketplace_category_id ?? '',
        categoryName: '',
        city: loc?.city ?? '',
      }
    }
    return EMPTY_FORM
  })

  const isPublishing = listing?.status === 'publishing'
  const isRemoving = listing?.status === 'removed' && removePending === listing?.id
  const isUpdating = updatePending === listing?.id
  const isMutating = publishPending || isUpdating || isRemoving

  const handlePublish = () => {
    void onPublish(connection.id, form)
  }

  const handleUpdate = () => {
    if (!listing) return
    void onUpdate(listing.id, form)
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{label}</span>
            {connection.account_name && (
              <p className="text-xs text-muted-foreground">{connection.account_name}</p>
            )}
          </div>
        </div>
        {listing && <ListingStatusBadge status={listing.status} />}
      </div>

      {/* Inactive connection — show amber warning, suppress form entirely */}
      {!connection.is_active && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-400">
            {messages.marketplace.connectionInactive}{' '}
            <a
              href="/admin/shop/marketplace"
              className="font-medium underline underline-offset-2 hover:text-amber-300"
              aria-label="Przejdź do ustawień marketplace aby ponownie połączyć"
            >
              {messages.marketplace.goToSettings}
            </a>
            .
          </p>
        </div>
      )}

      {/* In-progress publishing state */}
      {connection.is_active && isPublishing && !isMutating && (
        <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
          <p className="text-sm text-blue-400">{messages.marketplace.publishingInProgress}</p>
        </div>
      )}

      {/* External link if available */}
      {connection.is_active && listing?.external_url && listing.status === 'active' && (
        <a
          href={listing.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label={templates.marketplace.openListingAriaLabel(label)}
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {messages.marketplace.openListing}
        </a>
      )}

      {/* OLX expiry warning — shown when active listing expires within 7 days */}
      {connection.is_active &&
        isOlx &&
        listing?.status === 'active' &&
        listing.published_at &&
        (() => {
          const daysUntilExpiry = differenceInDays(
            addDays(new Date(listing.published_at), 30),
            new Date()
          )
          if (daysUntilExpiry > 7 || daysUntilExpiry < 0) return null
          return (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-400">
                  {templates.marketplace.olxExpiryDays(daysUntilExpiry)}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isMutating}
                  className="h-auto p-0 text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  {messages.marketplace.update}
                </Button>
              </div>
            </div>
          )
        })()}

      {/* Form — shown for both new listing and edit (hidden when connection inactive) */}
      {connection.is_active && (!listing || listing.status === 'active' || listing.status === 'error') && !isPublishing && (
        <div className="space-y-4 rounded-md border border-border bg-muted/20 p-3">
          <CategorySelector
            connectionId={connection.id}
            value={form.categoryId || undefined}
            valueName={form.categoryName || undefined}
            onChange={(id, name) => setForm((f) => ({ ...f, categoryId: id, categoryName: name }))}
          />

          {isOlx && (
            <LocationSelector
              value={form.city}
              onChange={(city) => setForm((f) => ({ ...f, city }))}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {!listing ? (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isMutating || !connection.is_active}
                aria-label={`Opublikuj na ${label}`}
                className="flex-1"
              >
                {publishPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {messages.marketplace.publishing}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    {messages.marketplace.publish}
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdate}
                disabled={isMutating}
                aria-label={`Aktualizuj ogłoszenie na ${label}`}
                className="flex-1"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {messages.marketplace.updating}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    {messages.marketplace.update}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Remove button — separate, guarded by AlertDialog (hidden when connection inactive) */}
      {connection.is_active && listing && listing.status !== 'removed' && !isPublishing && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isMutating}
              className="gap-1.5 text-destructive hover:text-destructive/80"
              aria-label={`Usuń ogłoszenie z ${label}`}
            >
              {removePending === listing.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {removePending === listing.id ? messages.marketplace.removingListing : messages.marketplace.removeListing}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{templates.marketplace.removeListingTitle(label)}</AlertDialogTitle>
              <AlertDialogDescription>
                {templates.marketplace.removeListingDescription(label)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRemove(listing.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.marketplace.removeListingConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Error state on listing — show error detail + retry action */}
      {listing?.status === 'error' && listing.last_sync_error && (
        <div className="space-y-2">
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-xs text-destructive break-words">{listing.last_sync_error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePublish}
            disabled={isMutating}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label={`Spróbuj ponownie opublikować na ${label}`}
          >
            {publishPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            )}
            {messages.marketplace.retryPublish}
          </Button>
        </div>
      )}
    </div>
  )
}

// --- Main panel ---

export function MarketplacePublishPanel({ productId }: MarketplacePublishPanelProps) {
  const queryClient = useQueryClient()

  // Track pending mutations per listing
  const [publishingConnectionId, setPublishingConnectionId] = useState<string | null>(null)
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null)
  const [removingListingId, setRemovingListingId] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // --- Connections query ---
  const {
    data: connections,
    isLoading: connectionsLoading,
    isError: connectionsError,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: queryKeys.marketplace.connections,
    queryFn: getMarketplaceConnections,
  })

  // --- Listings query (disabled for new products) ---
  const {
    data: listings,
    isLoading: listingsLoading,
    isError: listingsError,
    refetch: refetchListings,
  } = useQuery({
    queryKey: productId ? queryKeys.marketplace.listings(productId) : ['marketplace', 'listings-disabled'],
    queryFn: () => getMarketplaceListings(productId!),
    enabled: !!productId,
  })

  // --- Polling: refetch listings when any are in 'publishing' state ---
  const hasPublishingListings = listings?.some((l) => l.status === 'publishing')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!productId || !hasPublishingListings) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(() => {
      void refetchListings()
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [hasPublishingListings, productId, refetchListings])

  // --- Mutations ---

  const invalidateListings = () => {
    if (productId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all })
    }
  }

  const handlePublish = async (connectionId: string, form: ListingFormState) => {
    if (!productId) return
    setMutationError(null)
    setPublishingConnectionId(connectionId)

    try {
      const result = await publishToMarketplace({
        productId,
        connectionId,
        marketplaceCategoryId: form.categoryId || undefined,
        marketplaceLocation: form.city ? { city: form.city } : undefined,
        marketplaceParams: undefined,
      })

      if (!result.success) {
        setMutationError(result.error ?? messages.marketplace.publishFailed)
      } else {
        invalidateListings()
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setPublishingConnectionId(null)
    }
  }

  const handleUpdate = async (listingId: string, form: ListingFormState) => {
    setMutationError(null)
    setUpdatingListingId(listingId)

    try {
      const result = await updateMarketplaceListing(listingId, {
        marketplaceCategoryId: form.categoryId || undefined,
        marketplaceLocation: form.city ? { city: form.city } : undefined,
        marketplaceParams: undefined,
      })

      if (!result.success) {
        setMutationError(result.error ?? messages.marketplace.updateFailed)
      } else {
        invalidateListings()
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setUpdatingListingId(null)
    }
  }

  const handleRemove = async (listingId: string) => {
    setMutationError(null)
    setRemovingListingId(listingId)

    try {
      const result = await removeMarketplaceListing(listingId)

      if (!result.success) {
        setMutationError(result.error ?? messages.marketplace.removeFailed)
      } else {
        invalidateListings()
      }
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setRemovingListingId(null)
    }
  }

  // --- Render ---

  const isLoading = connectionsLoading || (!!productId && listingsLoading)
  const isError = connectionsError || (!!productId && listingsError)

  return (
    <CollapsibleCard title={messages.marketplace.panelTitle} defaultOpen={false}>
      <div className="space-y-5">
        {/* New product — save first */}
        {!productId && (
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {messages.marketplace.saveProductFirst}
            </p>
          </div>
        )}

        {/* Loading state */}
        {productId && isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {messages.marketplace.loadingData}
          </div>
        )}

        {/* Error state */}
        {productId && isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{messages.marketplace.loadingFailed}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refetchConnections()
                if (productId) void refetchListings()
              }}
              aria-label="Ponów ładowanie marketplace"
            >
              {messages.marketplace.retryLoad}
            </Button>
          </div>
        )}

        {/* No connections */}
        {productId && !isLoading && !isError && connections && connections.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {messages.marketplace.noConnections}{' '}
            <a
              href="/admin/shop/marketplace"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {messages.marketplace.noConnectionsLinkText}
            </a>
            .
          </p>
        )}

        {/* Mutation error banner */}
        {mutationError && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{mutationError}</p>
          </div>
        )}

        {/* Connected marketplaces */}
        {productId && !isLoading && !isError && connections && connections.length > 0 && (
          <div className="space-y-6">
            {connections.map((connection, index) => {
              const listing = listings?.find((l) => l.connection_id === connection.id)
              const isLast = index === connections.length - 1

              return (
                <div key={connection.id}>
                  <MarketplaceSection
                    connection={connection}
                    listing={listing}
                    productId={productId}
                    onPublish={handlePublish}
                    onUpdate={handleUpdate}
                    onRemove={handleRemove}
                    publishPending={publishingConnectionId === connection.id}
                    updatePending={updatingListingId}
                    removePending={removingListingId}
                  />
                  {!isLast && <hr className="mt-6 border-border" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}
