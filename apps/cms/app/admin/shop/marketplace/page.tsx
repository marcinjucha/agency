import { Metadata } from 'next'
import { MarketplaceSettingsPage } from '@/features/shop-marketplace/components'

export const metadata: Metadata = { title: 'Marketplace | Halo-Efekt CMS' }

export default function Page() {
  return <MarketplaceSettingsPage />
}
