'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@agency/ui'
import { getGoogleCalendarStatus, disconnectGoogleCalendar } from '../actions'
import { AlertCircle, CheckCircle, Loader2, LogOut } from 'lucide-react'
import { messages } from '@/lib/messages'

interface CalendarStatus {
  connected: boolean
  email?: string
  error?: string
}

export function CalendarSettings() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [showMessage, setShowMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Load initial status
  useEffect(() => {
    loadStatus()

    // Check for OAuth callback messages from URL search params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const successParam = params.get('success')
      const errorParam = params.get('error')

      if (successParam) {
        setShowMessage({ type: 'success', text: successParam })
        // Clear URL params
        window.history.replaceState({}, '', '/admin/settings')
      } else if (errorParam) {
        setShowMessage({ type: 'error', text: errorParam })
        // Clear URL params
        window.history.replaceState({}, '', '/admin/settings')
      }
    }
  }, [])

  async function loadStatus() {
    try {
      const result = await getGoogleCalendarStatus()
      setStatus(result)
    } catch (error) {
      setStatus({
        connected: false,
        error: messages.calendar.loadStatusFailed,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    // Redirect to OAuth initiation endpoint
    window.location.href = '/api/auth/google'
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
        setStatus({ connected: false })
        // Reload status after a short delay
        setTimeout(() => loadStatus(), 1000)
      } else {
        setShowMessage({
          type: 'error',
          text: result.error || messages.calendar.disconnectError,
        })
      }
    } catch (error) {
      setShowMessage({
        type: 'error',
        text: messages.calendar.disconnectCalendarError,
      })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{messages.calendar.googleCalendar}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {messages.calendar.connectDescription}
        </p>
      </div>

      {/* Messages */}
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
              showMessage.type === 'success' ? 'text-status-success-foreground' : 'text-destructive'
            }
          >
            {showMessage.text}
          </p>
        </div>
      )}

      {/* Status */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : status?.connected ? (
        <div className="border border-status-success bg-status-success/10 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-status-success-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-status-success-foreground">{messages.calendar.connected}</p>
                <p className="text-sm text-status-success-foreground mt-1">
                  {messages.calendar.connectedAs} <span className="font-semibold">{status.email}</span>
                </p>
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

          {/* Disconnect Confirmation Dialog */}
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
      ) : (
        <div className="border border-border rounded-lg p-4">
          <p className="text-foreground mb-4">
            {messages.calendar.connectPrompt}
          </p>
          <Button type="button" onClick={handleConnect} className="w-full sm:w-auto">
            {messages.calendar.connectButton}
          </Button>
        </div>
      )}
    </div>
  )
}
