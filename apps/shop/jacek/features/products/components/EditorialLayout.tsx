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
    <div className="space-y-16">
      <div className="grid gap-8 lg:grid-cols-[380px_1fr] lg:gap-14">
        {product.cover_image_url && (
          <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-muted">
            <img
              src={product.cover_image_url}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
              style={{
                background:
                  'linear-gradient(to top, var(--color-background) 0%, transparent 100%)',
                opacity: 0.4,
              }}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-5">
            <div
              className="w-10 border-t-2"
              style={{ borderColor: 'var(--color-primary)' }}
              aria-hidden="true"
            />
            <h1
              className="font-bold leading-tight tracking-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              {product.title}
            </h1>
            {product.short_description && (
              <p className="text-lg text-foreground leading-relaxed">
                {product.short_description}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Cena
            </p>
            {price ? (
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {price}
              </p>
            ) : (
              <span
                className="inline-block rounded-sm px-3 py-1 text-sm font-medium text-primary"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
              >
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

      <div
        className="h-px"
        style={{ backgroundColor: 'var(--color-border)' }}
        aria-hidden="true"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:gap-12">
        {product.html_body && (
          <div
            className="product-prose product-prose--editorial"
            dangerouslySetInnerHTML={{ __html: product.html_body }}
          />
        )}

        <aside aria-label="Szczegóły produktu">
          <div
            className="sticky top-6 rounded-sm border border-border bg-card p-6 space-y-6"
            style={{ borderTopWidth: '2px', borderTopColor: 'var(--color-primary)' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Szczegóły
            </h2>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Cena
              </p>
              {price ? (
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {price}
                </p>
              ) : (
                <span
                  className="inline-block rounded-sm px-3 py-1 text-sm font-medium text-primary"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
                >
                  {messages.products.free}
                </span>
              )}
            </div>

            <ProductCta
              listingType={product.listing_type}
              externalUrl={product.external_url}
            />

            {product.tags && (product.tags as string[]).length > 0 && (
              <div className="space-y-3 pt-2">
                <div
                  className="h-px"
                  style={{ backgroundColor: 'var(--color-border)' }}
                  aria-hidden="true"
                />
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {messages.products.tags}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(product.tags as string[]).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm border border-border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
