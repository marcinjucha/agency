import type { ListingType, DisplayLayout } from './types'
import { messages } from '@/lib/messages'

export { generateSlug } from '@/lib/utils/slug'

// --- Formatting helpers ---

export function formatPrice(price: number | null, currency = 'PLN'): string {
  if (price === null) return '—'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

export function getListingTypeLabel(type: ListingType): string {
  const labels: Record<ListingType, string> = {
    external_link: messages.shop.listingTypeExternalLink,
    digital_download: messages.shop.listingTypeDigitalDownload,
  }
  return labels[type]
}

export function getDisplayLayoutLabel(layout: DisplayLayout): string {
  const labels: Record<DisplayLayout, string> = {
    gallery: messages.shop.displayLayoutGallery,
    editorial: messages.shop.displayLayoutEditorial,
  }
  return labels[layout]
}
