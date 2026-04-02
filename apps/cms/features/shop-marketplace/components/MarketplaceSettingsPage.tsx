'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ErrorState, LoadingState } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { getMarketplaceConnections } from '../queries'
import { MARKETPLACE_OPTIONS } from '../types'
import type { MarketplaceConnection } from '../types'
import { MarketplaceConnectionCard } from './MarketplaceConnectionCard'

export function MarketplaceSettingsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const {
    data: connections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.marketplace.connections,
    queryFn: getMarketplaceConnections,
  })

  // Handle OAuth callback URL params (?connected= or ?error=)
  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')

    if (connected) {
      setFeedback({ type: 'success', message: messages.marketplace.connected })
      router.replace(pathname)
    } else if (oauthError) {
      const errorMessage =
        oauthError === 'denied'
          ? messages.marketplace.oauthDenied
          : messages.marketplace.oauthFailed
      setFeedback({ type: 'error', message: errorMessage })
      router.replace(pathname)
    }
  }, [searchParams, pathname, router])

  function findConnection(marketplace: string): MarketplaceConnection | null {
    return connections?.find((c) => c.marketplace === marketplace) ?? null
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <LoadingState variant="skeleton-card" rows={2} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <ErrorState
          title={messages.common.errorOccurred}
          message={error instanceof Error ? error.message : messages.common.unknownError}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MARKETPLACE_OPTIONS.map((opt) => (
          <MarketplaceConnectionCard
            key={opt.value}
            marketplace={opt.value}
            connection={findConnection(opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        {messages.marketplace.pageTitle}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {messages.marketplace.pageSubtitle}
      </p>
    </div>
  )
}

function FeedbackBanner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
        type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-destructive/10 text-destructive border-destructive/20'
      }`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-4 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label={messages.common.close}
      >
        &times;
      </button>
    </div>
  )
}
