'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
import { useRouter } from 'next/navigation'
import { Trash2, ArrowUpDown } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { formatPrice } from '../utils'
import { StatusBadge, ListingTypeBadge } from './badges'
import { ShopProductCard } from './ShopProductCard'
import { MarketplaceStatusDots } from '@/features/shop-marketplace/components/MarketplaceStatusDots'
import type { ShopProductListItem } from '../types'
import type { ShopCategory } from '@/features/shop-categories/types'
import type { MarketplaceListing, MarketplaceId } from '@/features/shop-marketplace/types'

interface ShopProductListViewProps {
  products: ShopProductListItem[]
  categories: ShopCategory[]
  onDelete: (id: string) => void
  deletingId: string | undefined
  viewMode: 'grid' | 'list'
  marketplaceListings: MarketplaceListing[]
  connectedMarketplaces: MarketplaceId[]
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '\u2014'
  try {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '\u2014'
  }
}

function getCategoryName(categoryId: string | null, categories: ShopCategory[]): string {
  if (!categoryId) return '\u2014'
  const cat = categories.find((c) => c.id === categoryId)
  return cat?.name ?? '\u2014'
}

export function ShopProductListView({
  products,
  categories,
  onDelete,
  deletingId,
  viewMode,
  marketplaceListings,
  connectedMarketplaces,
}: ShopProductListViewProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all')
  const [sortNewest, setSortNewest] = useState(true)

  const filteredAndSorted = useMemo(() => {
    let result = [...products]

    if (statusFilter === 'published') {
      result = result.filter((p) => p.is_published)
    } else if (statusFilter === 'draft') {
      result = result.filter((p) => !p.is_published)
    }

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category_id === categoryFilter)
    }

    if (listingTypeFilter !== 'all') {
      result = result.filter((p) => p.listing_type === listingTypeFilter)
    }

    result.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime()
      const dateB = new Date(b.updated_at).getTime()
      return sortNewest ? dateB - dateA : dateA - dateB
    })

    return result
  }, [products, statusFilter, categoryFilter, listingTypeFilter, sortNewest])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={messages.shop.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.shop.allCategories}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={messages.shop.allStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.shop.allStatuses}</SelectItem>
            <SelectItem value="published">{messages.shop.statusPublished}</SelectItem>
            <SelectItem value="draft">{messages.shop.statusDraft}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={messages.shop.allListingTypes} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.shop.allListingTypes}</SelectItem>
            <SelectItem value="external_link">{messages.shop.listingTypeExternalLink}</SelectItem>
            <SelectItem value="digital_download">{messages.shop.listingTypeDigitalDownload}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortNewest((prev) => !prev)}
          className="gap-2 text-muted-foreground"
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          {sortNewest ? messages.shop.sortNewest : messages.shop.sortOldest}
        </Button>
      </div>

      {/* Content */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {messages.shop.noMatchingProducts}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredAndSorted.map((product) => (
            <ShopProductCard
              key={product.id}
              product={product}
              categoryName={getCategoryName(product.category_id, categories)}
              onDelete={() => onDelete(product.id)}
              isDeleting={deletingId === product.id}
              marketplaceListings={marketplaceListings.filter((l) => l.product_id === product.id)}
              connectedMarketplaces={connectedMarketplaces}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filteredAndSorted.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              categoryName={getCategoryName(product.category_id, categories)}
              onNavigate={() => router.push(routes.admin.shopProduct(product.id))}
              onDelete={() => onDelete(product.id)}
              isDeleting={deletingId === product.id}
              marketplaceListings={marketplaceListings.filter((l) => l.product_id === product.id)}
              connectedMarketplaces={connectedMarketplaces}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      <p className="text-xs text-muted-foreground">
        {messages.shop.productsCount(filteredAndSorted.length, products.length)}
      </p>
    </div>
  )
}

// --- List row ---

function ProductRow({
  product,
  categoryName,
  onNavigate,
  onDelete,
  isDeleting,
  marketplaceListings,
  connectedMarketplaces,
}: {
  product: ShopProductListItem
  categoryName: string
  onNavigate: () => void
  onDelete: () => void
  isDeleting: boolean
  marketplaceListings: MarketplaceListing[]
  connectedMarketplaces: MarketplaceId[]
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate()
        }
      }}
    >
      {/* Thumbnail */}
      <div className="hidden sm:block h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-muted-foreground/40 text-xs font-medium">
            P
          </div>
        )}
      </div>

      {/* Title + short description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {product.title}
        </p>
        {product.short_description && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {product.short_description}
          </p>
        )}
      </div>

      {/* Marketplace status dots */}
      {connectedMarketplaces.length > 0 && (
        <div className="hidden sm:block flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <MarketplaceStatusDots
            listings={marketplaceListings}
            connectedMarketplaces={connectedMarketplaces}
          />
        </div>
      )}

      {/* Category */}
      <div className="hidden lg:block flex-shrink-0">
        <span className="text-xs text-muted-foreground">{categoryName}</span>
      </div>

      {/* Status badge */}
      <div className="hidden md:block flex-shrink-0">
        <StatusBadge isPublished={product.is_published} />
      </div>

      {/* Listing type badge */}
      <div className="hidden lg:block flex-shrink-0">
        <ListingTypeBadge listingType={product.listing_type} />
      </div>

      {/* Price */}
      <div className="hidden sm:block flex-shrink-0 text-xs text-muted-foreground w-24 text-right">
        {formatPrice(product.price, product.currency)}
      </div>

      {/* Date */}
      <div className="hidden sm:block flex-shrink-0 text-xs text-muted-foreground w-24 text-right">
        {formatDate(product.updated_at)}
      </div>

      {/* Delete */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
              aria-label={messages.common.delete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {messages.shop.deleteProductConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {messages.shop.deleteProductConfirmDescription(product.title)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
