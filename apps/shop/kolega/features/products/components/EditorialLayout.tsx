import Image from 'next/image'
import type { ShopProductPublic } from '../types'
import { formatPrice } from '../utils'
import { ProductCta } from './ProductCta'
import { messages } from '@/lib/messages'

type EditorialLayoutProps = {
  product: ShopProductPublic
}

export function EditorialLayout({ product }: EditorialLayoutProps) {
  const price = formatPrice(product.price, product.currency ?? 'PLN')

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      {/* Hero */}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
        {product.cover_image_url && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            <Image
              src={product.cover_image_url}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 300px"
              priority
            />
          </div>
        )}

        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold leading-tight">{product.title}</h1>
            {product.short_description && (
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
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
        </div>
      </div>

      {/* Content + Sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Rich text content */}
        {product.html_body && (
          <div
            className="product-prose max-w-none"
            dangerouslySetInnerHTML={{ __html: product.html_body }}
          />
        )}

        {/* Sidebar metadata */}
        <aside className="space-y-6">
          {product.tags && product.tags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {messages.products.tags}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(product.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
