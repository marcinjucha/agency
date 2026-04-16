import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { MarketplaceImportWizardPage } from '@/features/shop-marketplace/components'

export const Route = createFileRoute('/admin/shop/marketplace/import')({
  head: () => buildCmsHead(messages.marketplace.importPageTitle),
  component: MarketplaceImportPage,
})

function MarketplaceImportPage() {
  return <MarketplaceImportWizardPage />
}
