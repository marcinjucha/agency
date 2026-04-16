import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { MarketplaceSettingsPage } from '@/features/shop-marketplace/components'

export const Route = createFileRoute('/admin/shop/marketplace/')({
  head: () => buildCmsHead(messages.marketplace.pageTitle),
  component: MarketplaceIndexPage,
})

function MarketplaceIndexPage() {
  return <MarketplaceSettingsPage />
}
