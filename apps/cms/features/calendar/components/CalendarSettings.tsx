'use client'

import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@agency/ui'
import {
  getGoogleCalendarStatus,
  getCalendarTokenStatus,
  disconnectGoogleCalendar,
} from '../actions'
import { AlertCircle, CheckCircle, Loader2, LogOut } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type TokenStatus = 'connected' | 'expired' | 'disconnected'

interface CalendarState {
  tokenStatus: TokenStatus
  email?: string
  expiresAt: string | null
  error?: string
}

export function CalendarSettings() {
  const [state, setState] = useState<CalendarState | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [showMessage, setShowMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    loadStatus()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const successParam = params.get('success')
      const errorParam = params.get('error')

      if (successParam) {
        setShowMessage({ type: 'success', text: successParam })
        window.history.replaceState({}, '', routes.admin.settings)
      } else if (errorParam) {
        setShowMessage({ type: 'error', text: errorParam })
        window.history.replaceState({}, '', routes.admin.settings)
      }
    }
  }, [])

  async function loadStatus() {
    try {
      const [tokenResult, statusResult] = await Promise.all([
        getCalendarTokenStatus(),
        getGoogleCalendarStatus(),
      ])

      setState({
        tokenStatus: tokenResult.status,
        email: statusResult.email,
        expiresAt: tokenResult.expiresAt,
        error: statusResult.error,
      })
    } catch {
      setState({
        tokenStatus: 'disconnected',
        expiresAt: null,
        error: messages.calendar.loadStatusFailed,
      })
    } finally {
      setLoading(false)
    }
  }

  function handleConnect() {
    window.location.href = routes.api.authGoogle
  }

  function handleDisconnectClick() {
    setShowDisconnectDialog(true)
  }

  async function handleConfirmDisconnect() {
    setShowDisconnectDialog(false)
    setDisconnecting(true)
    try {
      const result = await disconnectGoogleCalendar()

      if (result.success) {
        setShowMessage({
          type: 'success',
          text: messages.calendar.disconnected,
        })
        setState({
          tokenStatus: 'disconnected',
          expiresAt: null,
        })
        setTimeout(() => loadStatus(), 1000)
      } else {
        setShowMessage({
          type: 'error',
          text: result.error || messages.calendar.disconnectError,
        })
      }
    } catch {
      setShowMessage({
        type: 'error',
        text: messages.calendar.disconnectCalendarError,
      })
    } finally {
      setDisconnecting(false)
    }
  }

  function formatExpiryDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{messages.calendar.googleCalendar}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {messages.calendar.connectDescription}
        </p>
      </div>

      {showMessage && (
        <div
          className={`p-3 rounded-lg flex items-start gap-3 ${
            showMessage.type === 'success'
              ? 'bg-status-success/10 border border-status-success'
              : 'bg-destructive/10 border border-destructive'
          }`}
        >
          {showMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-status-success-foreground flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          )}
          <p
            className={
              showMessage.type === 'success'
                ? 'text-status-success-foreground'
                : 'text-destructive'
            }
          >
            {showMessage.text}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : state?.tokenStatus === 'connected' ? (
        <div className="border border-status-success bg-status-success/10 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-status-success-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-status-success-foreground">
                    {messages.calendar.connected}
                  </p>
                  <Badge className="bg-status-success/15 text-status-success-foreground border-status-success/30">
                    Połączony
                  </Badge>
                </div>
                {state.email && (
                  <p className="text-sm text-status-success-foreground">
                    {messages.calendar.connectedAs}{' '}
                    <span className="font-semibold">{state.email}</span>
                  </p>
                )}
                {state.expiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Token ważny do:{' '}
                    <span className="font-medium text-foreground">
                      {formatExpiryDate(state.expiresAt)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleDisconnectClick}
            disabled={disconnecting}
            className="mt-4 w-full sm:w-auto"
          >
            {disconnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {messages.calendar.disconnecting}
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                {messages.calendar.disconnectCalendar}
              </>
            )}
          </Button>
        </div>
      ) : state?.tokenStatus === 'expired' ? (
        <div className="border border-status-warning bg-status-warning/10 rounded-lg p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-status-warning-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-status-warning-foreground">
                    Token wygasł
                  </p>
                  <Badge className="bg-status-warning/15 text-status-warning-foreground border-status-warning/30">
                    Wygasł
                  </Badge>
                </div>
                {state.email && (
                  <p className="text-sm text-muted-foreground">
                    {messages.calendar.connectedAs}{' '}
                    <span className="font-medium text-foreground">{state.email}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {messages.calendar.tokenExpiredExplanation}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Button
                type="button"
                onClick={handleConnect}
                className="w-full sm:w-auto"
              >
                Odnów połączenie
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnectClick}
                disabled={disconnecting}
                className="w-full sm:w-auto"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {messages.calendar.disconnecting}
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    {messages.calendar.disconnectCalendar}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                  Niepołączony
                </Badge>
              </div>
              <p className="text-foreground">
                {messages.calendar.connectPrompt}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleConnect}
            className="mt-4 w-full sm:w-auto"
          >
            {messages.calendar.connectButton}
          </Button>
        </div>
      )}

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.calendar.disconnectConfirmTitle}</DialogTitle>
            <DialogDescription>
              {messages.calendar.disconnectConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              className="flex-1"
            >
              {messages.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDisconnect}
              className="flex-1"
            >
              {messages.calendar.disconnect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
