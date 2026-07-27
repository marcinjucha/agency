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
  // Append the provider's own code — "535" is what a Google support page asks for.
  const detail = [result.responseCode, result.httpStatus, result.code]
    .filter(Boolean)
    .join(' · ')
  const base = FAILURE_MESSAGES[result.reason]
  return { ok: false, text: detail ? `${base} (${detail})` : base }
}

export function MailConnectionTester({ clientId }: { clientId: string }) {
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null)

  async function runTest() {
    setRunning(true)
    setOutcome(null)
    const response = await testClientMailConnectionFn({ data: { id: clientId } })
    setOutcome(
      response?.success && response.data
        ? describeResult(response.data)
        : { ok: false, text: response?.error ?? messages.venture.mailTestError },
    )
    setRunning(false)
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
