import { useState } from 'react'
import { Button } from '@agency/ui'
import { messages } from '@/lib/messages'
import { testClientMailConnectionFn } from '../admin'
import type { MailConnectionTest } from '../mail/classify-verify-error'

// Tests the SAVED configuration (the server reads the row), so an unsaved edit
// is not what gets checked — said plainly in the help text rather than guessed at.

const FAILURE_MESSAGES = {
  auth_rejected: messages.venture.mailTestAuthRejected,
  connection: messages.venture.mailTestConnection,
  unknown: messages.venture.mailTestUnknown,
} as const

function describeResult(result: MailConnectionTest): { ok: boolean; text: string } {
  if (result.status === 'ok') return { ok: true, text: messages.venture.mailTestOk }
  if (result.status === 'unsupported') {
    return { ok: false, text: messages.venture.mailTestUnsupported }
  }
  if (result.status === 'shared_fallback') {
    return { ok: false, text: messages.venture.mailTestSharedFallback }
  }
  // Append the provider's own code — "535" is what a Google support page asks for.
  const detail = [result.responseCode, result.httpStatus, result.code]
    .filter(Boolean)
    .join(' · ')
  const base = FAILURE_MESSAGES[result.reason]
  // A Resend key scoped to sending only is refused by the domains read we use to
  // authenticate, so say so rather than let the Gmail advice mislead.
  const scopeNote =
    result.reason === 'auth_rejected' && result.provider.startsWith('resend')
      ? ` ${messages.venture.mailTestResendScopeNote}`
      : ''
  return { ok: false, text: `${detail ? `${base} (${detail})` : base}${scopeNote}` }
}

export function MailConnectionTester({ clientId }: { clientId: string }) {
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null)

  async function runTest() {
    setRunning(true)
    setOutcome(null)
    try {
      const response = await testClientMailConnectionFn({ data: { id: clientId } })
      setOutcome(
        response?.success && response.data
          ? describeResult(response.data)
          : { ok: false, text: response?.error ?? messages.venture.mailTestError },
      )
    } catch {
      // The RPC itself can reject (network drop, an unexpected throw in the
      // handler chain). Without this the button would sit disabled on
      // "Sprawdzam…" forever, with no error and an unhandled rejection.
      setOutcome({ ok: false, text: messages.venture.mailTestError })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <div>
        <Button type="button" variant="outline" onClick={runTest} disabled={running}>
          {running ? messages.venture.mailTestRunning : messages.venture.mailTestButton}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{messages.venture.mailTestHelp}</p>
      {outcome && (
        <p
          role="status"
          className={`text-xs ${outcome.ok ? 'text-foreground' : 'text-destructive'}`}
        >
          {outcome.text}
        </p>
      )}
    </div>
  )
}
