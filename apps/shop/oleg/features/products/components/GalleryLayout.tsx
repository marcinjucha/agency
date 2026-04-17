import { useState } from 'react'
import type { ShopProductPublic } from '../types'
import { formatPrice } from '../utils'
import { ProductCta } from './ProductCta'
import { messages } from '@/lib/messages'

type GalleryLayoutProps = {
  product: ShopProductPublic
}

export function GalleryLayout({ product }: GalleryLayoutProps) {
  const allImages = [
    product.cover_image_url,
    ...((product.images as string[] | null) ?? []),
  ].filter(Boolean) as string[]

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = allImages[activeIndex] ?? null
  const price = formatPrice(product.price, product.currency ?? 'PLN')

  return (
    <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Gallery */}
      <div className="space-y-4">
        {activeImage && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            <img
              src={activeImage}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`relative h-20 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                  i === activeIndex ? 'border-primary' : 'border-border hover:border-muted-foreground'
                }`}
                aria-label={`${messages.products.photo} ${i + 1}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          {product.short_description && (
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {product.short_description}
            </p>
          )}
        </div>

        <div>
          {price ? (
            <span className="text-2xl font-bold text-foreground">{price}</span>
          ) : (
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {messages.products.free}
            </span>
          )}
        </div>

        <ProductCta
          listingType={product.listing_type}
          externalUrl={product.external_url}
        />

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(product.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
