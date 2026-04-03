import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingState } from '@agency/ui'
import { MarketplaceImportWizardPage } from '@/features/shop-marketplace/components/MarketplaceImportWizardPage'

export const metadata: Metadata = { title: 'Import z marketplace | Halo-Efekt CMS' }

export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="skeleton-card" rows={3} />}>
      <MarketplaceImportWizardPage />
    </Suspense>
  )
}
