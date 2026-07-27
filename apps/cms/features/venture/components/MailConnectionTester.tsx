import { useState } from 'react'
import { Button } from '@agency/ui'
import { messages } from '@/lib/messages'
import { testClientMailConnectionFn } from '../admin'
import { describeConnectionTest } from '../utils/describe-connection-test'

/**
 * Tests the SAVED configuration (the server reads the row). The parent remounts
 * this via `key` whenever a mail field changes, so a verdict can never outlive
 * the configuration it was produced for.
 */
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
          ? describeConnectionTest(response.data)
          : { ok: false, text: response?.error ?? messages.venture.mailTestError },
      )
    } catch {
      // The RPC itself can reject; without this the button would stay disabled
      // on "Sprawdzam…" forever with no error and an unhandled rejection.
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
