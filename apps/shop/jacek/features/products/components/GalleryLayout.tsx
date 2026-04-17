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
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-4">
          {activeImage && (
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-muted">
              <img
                src={activeImage}
                alt={product.title}
                className="w-full h-full object-cover transition-opacity duration-300"
                loading="eager"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{
                  background:
                    'linear-gradient(to top, var(--color-background) 0%, transparent 100%)',
                  opacity: 0.35,
                }}
              />
            </div>
          )}

          {allImages.length > 1 && (
            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label="Galeria zdjęć produktu"
            >
              {allImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Zdjęcie ${i + 1} z ${allImages.length}`}
                  aria-pressed={i === activeIndex}
                  className="relative h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover transition-opacity duration-200"
                    style={{ opacity: i === activeIndex ? 1 : 0.45 }}
                    loading="lazy"
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 transition-colors duration-200"
                    style={{
                      backgroundColor: i === activeIndex ? 'var(--color-primary)' : 'transparent',
                    }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-0">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{product.title}</h1>
            {product.short_description && (
              <p className="text-foreground leading-relaxed text-base">
                {product.short_description}
              </p>
            )}
          </div>

          <div
            className="my-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
            aria-hidden="true"
          />

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-foreground">Cena</p>
            {price ? (
              <p className="text-3xl font-bold text-foreground tracking-tight">{price}</p>
            ) : (
              <span
                className="inline-block rounded-sm px-3 py-1 text-sm font-medium text-primary"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                }}
              >
                {messages.products.free}
              </span>
            )}
          </div>

          <div className="mt-6">
            <ProductCta listingType={product.listing_type} externalUrl={product.external_url} />
          </div>

          {product.tags && (product.tags as string[]).length > 0 && (
            <div className="mt-8 space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-foreground">
                {messages.products.tags}
              </p>
              <div className="flex flex-wrap gap-2">
                {(product.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm border border-border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {product.html_body && (
        <>
          <div
            className="h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
            aria-hidden="true"
          />
          <div
            className="product-prose mx-auto max-w-4xl"
            dangerouslySetInnerHTML={{ __html: product.html_body }}
          />
        </>
      )}
    </div>
  )
}
