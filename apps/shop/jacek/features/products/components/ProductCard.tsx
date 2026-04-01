import Image from 'next/image'
import Link from 'next/link'
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
      href={routes.product(product.slug)}
      className="group block rounded-lg border border-border bg-card overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/4] bg-muted">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-muted-foreground/40 font-serif">
              {product.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-serif text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {product.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {product.short_description}
          </p>
        )}

        <div className="pt-1">
          {price ? (
            <span className="text-sm font-medium text-foreground">{price}</span>
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
