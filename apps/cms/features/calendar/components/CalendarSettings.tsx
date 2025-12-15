'use client'

import { useEffect, useState } from 'react'
import { Button } from '@legal-mind/ui'
import { getGoogleCalendarStatus, disconnectGoogleCalendar } from '../actions'
import { AlertCircle, CheckCircle, Loader2, LogOut } from 'lucide-react'

interface CalendarStatus {
  connected: boolean
  email?: string
  error?: string
}

export function CalendarSettings() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
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
        error: 'Failed to load calendar status',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    // Redirect to OAuth initiation endpoint
    window.location.href = '/api/auth/google'
  }

  async function handleDisconnect() {
    if (!window.confirm('Are you sure? This will revoke Google Calendar access.')) {
      return
    }

    setDisconnecting(true)
    try {
      const result = await disconnectGoogleCalendar()
      if (result.success) {
        setShowMessage({
          type: 'success',
          text: 'Google Calendar disconnected',
        })
        setStatus({ connected: false })
        // Reload status after a short delay
        setTimeout(() => loadStatus(), 1000)
      } else {
        setShowMessage({
          type: 'error',
          text: result.error || 'Failed to disconnect',
        })
      }
    } catch (error) {
      setShowMessage({
        type: 'error',
        text: 'Failed to disconnect calendar',
      })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <p className="text-sm text-gray-600 mt-1">
          Connect your Google Calendar to enable client booking
        </p>
      </div>

      {/* Messages */}
      {showMessage && (
        <div
          className={`p-3 rounded-lg flex items-start gap-3 ${
            showMessage.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {showMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={
              showMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }
          >
            {showMessage.text}
          </p>
        </div>
      )}

      {/* Status */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : status?.connected ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Connected</p>
                <p className="text-sm text-green-700 mt-1">
                  Connected as <span className="font-semibold">{status.email}</span>
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="mt-4 w-full sm:w-auto"
          >
            {disconnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Calendar
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-gray-700 mb-4">
            Click the button below to connect your Google Calendar account.
          </p>
          <Button onClick={handleConnect} className="w-full sm:w-auto">
            Connect Google Calendar
          </Button>
        </div>
      )}
    </div>
  )
}
