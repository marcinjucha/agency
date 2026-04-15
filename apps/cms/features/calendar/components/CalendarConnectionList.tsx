'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, EmptyState, ErrorState, LoadingState } from '@agency/ui'
import { Calendar, Globe, Plus } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getCalendarConnectionsFn, initiateGoogleOAuthFn } from '../server'
import { CalendarConnectionCard } from './CalendarConnectionCard'
import { AddCalDAVDialog } from './AddCalDAVDialog'

export function CalendarConnectionList() {
  const [caldavDialogOpen, setCaldavDialogOpen] = useState(false)
  const [oauthMessage, setOauthMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Handle OAuth redirect query params
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const successParam = params.get('success')
    const errorParam = params.get('error')

    if (successParam) {
      setOauthMessage({ type: 'success', text: successParam })
      window.history.replaceState({}, '', routes.admin.settings)
    } else if (errorParam) {
      setOauthMessage({ type: 'error', text: errorParam })
      window.history.replaceState({}, '', routes.admin.settings)
    }
  }, [])

  const {
    data: connections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.calendar.connections,
    queryFn: async () => {
      const result = await getCalendarConnectionsFn()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })

  async function handleConnectGoogle() {
    const result = await initiateGoogleOAuthFn()
    if (result.success) {
      window.location.href = result.data.authUrl
    } else {
      setOauthMessage({ type: 'error', text: result.error })
    }
  }

  if (isLoading) {
    return <LoadingState variant="skeleton-card" rows={2} />
  }

  if (error) {
    return (
      <ErrorState
        title={messages.calendar.fetchConnectionsFailed}
        message={error instanceof Error ? error.message : messages.common.unknownError}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{messages.calendar.connectionsTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {messages.calendar.connectionsDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCaldavDialogOpen(true)}
          >
            <Globe className="mr-2 h-4 w-4" />
            {messages.calendar.addCalDAV}
          </Button>
          <Button
            size="sm"
            onClick={handleConnectGoogle}
          >
            <Plus className="mr-2 h-4 w-4" />
            {messages.calendar.connectGoogle}
          </Button>
        </div>
      </div>

      {/* OAuth redirect message */}
      {oauthMessage && (
        <div
          role="alert"
          className={`rounded-md border px-3 py-2.5 text-sm ${
            oauthMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {oauthMessage.text}
        </div>
      )}

      {/* Connection cards */}
      {!connections || connections.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={messages.calendar.noConnectionsTitle}
          description={messages.calendar.noConnectionsDescription}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((connection) => (
            <CalendarConnectionCard key={connection.id} connection={connection} />
          ))}
        </div>
      )}

      {/* CalDAV dialog */}
      <AddCalDAVDialog
        open={caldavDialogOpen}
        onOpenChange={setCaldavDialogOpen}
      />
    </div>
  )
}
