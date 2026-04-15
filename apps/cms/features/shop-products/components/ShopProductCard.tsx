

import {
  Card,
  CardContent,
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
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { formatPrice } from '../utils'
import { StatusBadge, ListingTypeBadge } from './badges'
import { MarketplaceStatusDots } from '@/features/shop-marketplace/components/MarketplaceStatusDots'
import type { ShopProductListItem } from '../types'
import type { MarketplaceListing, MarketplaceId } from '@/features/shop-marketplace/types'

interface ShopProductCardProps {
  product: ShopProductListItem
  categoryName: string
  onDelete: () => void
  isDeleting: boolean
  marketplaceListings: MarketplaceListing[]
  connectedMarketplaces: MarketplaceId[]
}

export function ShopProductCard({ product, categoryName, onDelete, isDeleting, marketplaceListings, connectedMarketplaces }: ShopProductCardProps) {
  const router = useRouter()

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-transform hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring"
      role="button"
      tabIndex={0}
      onClick={() => router.push(routes.admin.shopProduct(product.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(routes.admin.shopProduct(product.id))
        }
      }}
    >
      {/* Cover image */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <span className="text-lg font-semibold text-muted-foreground/20">
              {product.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Delete button (top-right overlay) */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isDeleting}
                aria-label={messages.common.delete}
              >
                <Trash2 className="h-3.5 w-3.5" />
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

      {/* Content */}
      <CardContent className="p-2.5 space-y-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {product.title}
        </h3>

        {product.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}

        {/* Category */}
        {categoryName !== '\u2014' && (
          <p className="text-xs text-muted-foreground">{categoryName}</p>
        )}

        {/* Footer: price + badges */}
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {formatPrice(product.price, product.currency)}
          </span>
          <div className="flex-1" />
          <ListingTypeBadge listingType={product.listing_type} />
          <StatusBadge isPublished={product.is_published} />
        </div>

        {/* Marketplace status dots */}
        {connectedMarketplaces.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <MarketplaceStatusDots
              listings={marketplaceListings}
              connectedMarketplaces={connectedMarketplaces}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
