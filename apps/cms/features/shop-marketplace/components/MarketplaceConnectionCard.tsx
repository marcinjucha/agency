

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import { Store, AlertTriangle } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages, templates } from '@/lib/messages'
import { disconnectMarketplace } from '../actions'
import { MARKETPLACE_LABELS } from '../types'
import type { MarketplaceId, MarketplaceConnection } from '../types'
import { ConnectMarketplaceButton } from './ConnectMarketplaceButton'

/** Returns true if token expires within 2 hours */
function isTokenExpiringSoon(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false
  const expiresAt = new Date(tokenExpiresAt).getTime()
  const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000
  return expiresAt < twoHoursFromNow && expiresAt > Date.now()
}

/** Returns true if token is already expired */
function isTokenExpired(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false
  return new Date(tokenExpiresAt).getTime() < Date.now()
}

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
  const tokenExpiringSoon = isTokenExpiringSoon(connection.token_expires_at)
  const tokenExpired = isTokenExpired(connection.token_expires_at)
  const lastSynced = connection.last_synced_at
    ? new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(connection.last_synced_at))
    : null

  // Determine connection badge
  let connectionBadgeClass: string
  let connectionBadgeLabel: string
  if (!isActive || tokenExpired) {
    connectionBadgeClass = 'bg-destructive/10 text-destructive border-destructive/20'
    connectionBadgeLabel = messages.marketplace.disconnected
  } else if (tokenExpiringSoon) {
    connectionBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    connectionBadgeLabel = messages.marketplace.tokenExpiringSoon
  } else {
    connectionBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    connectionBadgeLabel = messages.marketplace.active
  }

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
            className={connectionBadgeClass}
          >
            {connectionBadgeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token expiry warning */}
        {isActive && tokenExpiringSoon && !tokenExpired && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <p className="text-xs text-amber-400">{messages.marketplace.tokenExpiringSoonDescription}</p>
          </div>
        )}

        {/* Expired token warning */}
        {tokenExpired && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-xs text-destructive">{messages.marketplace.tokenExpiredDescription}</p>
          </div>
        )}

        {lastSynced && (
          <p className="text-xs text-muted-foreground">
            {messages.marketplace.lastSync}: {lastSynced}
          </p>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disconnect.isPending}
              className="text-destructive hover:text-destructive/80"
              aria-label={`${messages.marketplace.disconnectButton} ${label}`}
            >
              {disconnect.isPending ? messages.common.loading : messages.marketplace.disconnectButton}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {messages.marketplace.disconnectButton} {label}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {templates.marketplace.disconnectConfirmDescription(label)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnect.mutate(connection.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.marketplace.disconnectButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {disconnect.error && (
          <p className="text-xs text-destructive" role="alert">
            {disconnect.error instanceof Error ? disconnect.error.message : messages.common.unknownError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
