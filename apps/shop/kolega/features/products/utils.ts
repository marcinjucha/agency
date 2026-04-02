import type { ShopProductPublic } from './types'

/**
 * Format price as Polish zloty (e.g., "29,99 zl").
 * Returns null for null/zero prices (free items).
 */
export function formatPrice(
  price: number | null,
  currency: string = 'PLN'
): string | null {
  if (price == null || price === 0) return null

  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Build JSON-LD Product schema for SEO.
 * https://schema.org/Product
 */
export function buildProductJsonLd(
  product: ShopProductPublic,
  siteUrl: string = 'https://kolega.haloefekt.pl'
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.short_description ?? undefined,
    image: product.cover_image_url ?? undefined,
    url: `${siteUrl}/produkty/${product.slug}`,
  }

  if (product.price != null && product.price > 0) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency ?? 'PLN',
      availability: 'https://schema.org/InStock',
      url: product.external_url ?? undefined,
    }
  }

  if (product.listing_type === 'digital_download') {
    jsonLd.additionalType = 'https://schema.org/Book'
  }

  return jsonLd
}
