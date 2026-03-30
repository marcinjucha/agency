'use client'

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
import type { ShopProductListItem } from '../types'

interface ShopProductCardProps {
  product: ShopProductListItem
  categoryName: string
  onDelete: () => void
  isDeleting: boolean
}

export function ShopProductCard({ product, categoryName, onDelete, isDeleting }: ShopProductCardProps) {
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
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <span className="text-3xl font-semibold text-muted-foreground/20">
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
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground truncate text-sm">
          {product.title}
        </h3>

        {product.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}

        {/* Category */}
        {categoryName !== '\u2014' && (
          <p className="text-xs text-muted-foreground">{categoryName}</p>
        )}

        {/* Footer: price + badges */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {formatPrice(product.price, product.currency)}
          </span>
          <div className="flex-1" />
          <ListingTypeBadge listingType={product.listing_type} />
          <StatusBadge isPublished={product.is_published} />
        </div>
      </CardContent>
    </Card>
  )
}
