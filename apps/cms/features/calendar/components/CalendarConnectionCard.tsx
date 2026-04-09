'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import {
  Globe,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  Trash2,
  PowerOff,
} from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import {
  testCalendarConnection,
  setDefaultConnection,
  disconnectCalendarConnection,
  removeConnection,
} from '../actions'
import type { CalendarConnection } from '../types'

type CalendarConnectionCardProps = {
  connection: CalendarConnection
}

function ProviderIcon({ provider }: { provider: CalendarConnection['provider'] }) {
  if (provider === 'google') {
    return <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  }
  return <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
}

function providerLabel(provider: CalendarConnection['provider']): string {
  return provider === 'google'
    ? messages.calendar.providerGoogle
    : messages.calendar.providerCalDAV
}

export function CalendarConnectionCard({ connection }: CalendarConnectionCardProps) {
  const queryClient = useQueryClient()
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [confirmAction, setConfirmAction] = useState<'remove' | 'deactivate' | null>(null)

  const testMutation = useMutation({
    mutationFn: async () => {
      const result = await testCalendarConnection(connection.id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      setTestResult('success')
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
      setTimeout(() => setTestResult(null), 3000)
    },
    onError: () => {
      setTestResult('error')
      setTimeout(() => setTestResult(null), 5000)
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const result = await setDefaultConnection(connection.id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const result = await disconnectCalendarConnection(connection.id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
      setConfirmAction(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const result = await removeConnection(connection.id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
      setConfirmAction(null)
    },
  })

  // Badge: Active/Inactive
  const statusBadgeClass = connection.isActive
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-muted text-muted-foreground border-border'
  const statusBadgeLabel = connection.isActive
    ? messages.calendar.statusActive
    : messages.calendar.statusInactive

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ProviderIcon provider={connection.provider} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {connection.displayName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {providerLabel(connection.provider)}
                  {connection.accountIdentifier && (
                    <> &middot; {connection.accountIdentifier}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {connection.isDefault && (
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-400 border-blue-500/20"
                >
                  {messages.calendar.statusDefault}
                </Badge>
              )}
              <Badge variant="outline" className={statusBadgeClass}>
                {statusBadgeLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Test result feedback */}
          {testResult === 'success' && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <p className="text-xs text-emerald-400">{messages.calendar.testConnectionSuccess}</p>
            </div>
          )}
          {testResult === 'error' && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2"
            >
              <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-xs text-destructive">
                {testMutation.error instanceof Error
                  ? testMutation.error.message
                  : messages.calendar.testConnectionFailed}
              </p>
            </div>
          )}

          {/* Mutation errors */}
          {(setDefaultMutation.error || deactivateMutation.error || removeMutation.error) && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2"
            >
              <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-xs text-destructive">
                {(() => {
                  const err = setDefaultMutation.error || deactivateMutation.error || removeMutation.error
                  return err instanceof Error ? err.message : messages.common.unknownError
                })()}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              aria-label={`${messages.calendar.actionTest}: ${connection.displayName}`}
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  {messages.calendar.testing}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  {messages.calendar.actionTest}
                </>
              )}
            </Button>

            {!connection.isDefault && connection.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDefaultMutation.mutate()}
                disabled={setDefaultMutation.isPending}
                aria-label={`${messages.calendar.actionSetDefault}: ${connection.displayName}`}
              >
                <Shield className="mr-2 h-3.5 w-3.5" />
                {messages.calendar.actionSetDefault}
              </Button>
            )}

            {connection.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmAction('deactivate')}
                aria-label={`${messages.calendar.actionDeactivate}: ${connection.displayName}`}
              >
                <PowerOff className="mr-2 h-3.5 w-3.5" />
                {messages.calendar.actionDeactivate}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmAction('remove')}
              className="text-destructive hover:text-destructive/80"
              aria-label={`${messages.calendar.actionRemove}: ${connection.displayName}`}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {messages.calendar.actionRemove}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm deactivate */}
      <AlertDialog
        open={confirmAction === 'deactivate'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.calendar.deactivateConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.calendar.deactivateConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {messages.common.loading}
                </>
              ) : (
                messages.calendar.actionDeactivate
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove */}
      <AlertDialog
        open={confirmAction === 'remove'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.calendar.removeConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.calendar.removeConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {messages.common.loading}
                </>
              ) : (
                messages.calendar.actionRemove
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
