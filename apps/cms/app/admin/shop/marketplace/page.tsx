import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingState } from '@agency/ui'
import { MarketplaceSettingsPage } from '@/features/shop-marketplace/components'

export const metadata: Metadata = { title: 'Marketplace | Halo-Efekt CMS' }

export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton-card" rows={2} />}>
      <MarketplaceSettingsPage />
    </Suspense>
  )
}
