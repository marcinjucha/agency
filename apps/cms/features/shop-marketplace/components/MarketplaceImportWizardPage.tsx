

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@agency/ui'
import { ChevronLeft } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { getMarketplaceConnections } from '../queries'
import { MarketplaceImportWizard } from './MarketplaceImportWizard'

export function MarketplaceImportWizardPage() {
  const {
    data: connections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.marketplace.connections,
    queryFn: getMarketplaceConnections,
  })

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href={routes.admin.shopMarketplace}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label={messages.marketplace.importBackToMarketplace}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {messages.marketplace.importBackToMarketplace}
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {messages.marketplace.importPageTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.marketplace.importPageSubtitle}
        </p>
      </div>

      {/* Content */}
      {isLoading && <LoadingState variant="skeleton-card" rows={2} />}

      {error && !isLoading && (
        <ErrorState
          title={messages.marketplace.loadingFailed}
          message={error instanceof Error ? error.message : messages.common.unknownError}
          onRetry={() => refetch()}
        />
      )}

      {connections && !isLoading && (
        <MarketplaceImportWizard
          connections={connections.filter((c) => c.is_active)}
        />
      )}
    </div>
  )
}
