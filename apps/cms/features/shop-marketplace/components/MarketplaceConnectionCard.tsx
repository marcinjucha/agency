'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, Badge } from '@agency/ui'
import { Store } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { disconnectMarketplace } from '../actions'
import { MARKETPLACE_LABELS } from '../types'
import type { MarketplaceId, MarketplaceConnection } from '../types'
import { ConnectMarketplaceButton } from './ConnectMarketplaceButton'

type MarketplaceConnectionCardProps = {
  marketplace: MarketplaceId
  connection: MarketplaceConnection | null
}

export function MarketplaceConnectionCard({
  marketplace,
  connection,
}: MarketplaceConnectionCardProps) {
  const queryClient = useQueryClient()
  const label = MARKETPLACE_LABELS[marketplace]

  const disconnect = useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await disconnectMarketplace(connectionId)
      if (!result.success) throw new Error(result.error ?? messages.common.unknownError)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all })
    },
  })

  if (!connection) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Store className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground">{messages.marketplace.notConnected}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ConnectMarketplaceButton marketplace={marketplace} />
        </CardContent>
      </Card>
    )
  }

  const displayName = connection.account_name ?? label
  const isActive = connection.is_active
  const lastSynced = connection.last_synced_at
    ? new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(connection.last_synced_at))
    : null

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Store className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground">
                {messages.marketplace.accountName}: {displayName}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }
          >
            {isActive ? messages.marketplace.active : messages.marketplace.inactive}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSynced && (
          <p className="text-xs text-muted-foreground">
            {messages.marketplace.lastSync}: {lastSynced}
          </p>
        )}
        <button
          onClick={() => disconnect.mutate(connection.id)}
          disabled={disconnect.isPending}
          className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
          aria-label={`${messages.marketplace.disconnectButton} ${label}`}
        >
          {disconnect.isPending ? messages.common.loading : messages.marketplace.disconnectButton}
        </button>
        {disconnect.error && (
          <p className="text-xs text-destructive" role="alert">
            {disconnect.error instanceof Error ? disconnect.error.message : messages.common.unknownError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
