import { messages } from '@/lib/messages'

type ProductCtaProps = {
  listingType: string
  externalUrl: string | null
}

export function ProductCta({ listingType, externalUrl }: ProductCtaProps) {
  if (!externalUrl) return null

  const isDownload = listingType === 'digital_download'
  const label = isDownload ? messages.products.download : messages.products.buyNow

  return (
    <a
      href={externalUrl}
      target={isDownload ? undefined : '_blank'}
      rel={isDownload ? undefined : 'noopener noreferrer'}
      download={isDownload || undefined}
      className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
    >
      {label}
    </a>
  )
}
