import { Link } from '@tanstack/react-router'
import type { ShopProductPublic } from '../types'
import { formatPrice } from '../utils'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type ProductCardProps = {
  product: ShopProductPublic
}

export function ProductCard({ product }: ProductCardProps) {
  const price = formatPrice(product.price, product.currency ?? 'PLN')

  return (
    <Link
      to={routes.product(product.slug)}
      className="group block rounded-md border border-border bg-card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] bg-muted">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-muted-foreground/40">
              {product.title.charAt(0)}
            </span>
          </div>
        )}

        {product.is_featured && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {messages.products.featured}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {product.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}

        <div className="pt-1">
          {price ? (
            <span className="text-base font-semibold text-foreground">{price}</span>
          ) : (
            <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {messages.products.free}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
