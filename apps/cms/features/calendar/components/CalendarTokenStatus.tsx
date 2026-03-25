import { Badge, Button, Card } from '@agency/ui'
import Link from 'next/link'
import { getCalendarTokenStatus } from '../actions'
import { messages } from '@/lib/messages'

export async function CalendarTokenStatus() {
  const { status, expiresAt } = await getCalendarTokenStatus()

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Status połączenia z Google Calendar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzaj połączeniem z kontem Google Calendar
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {status === 'connected' && (
          <>
            <Badge className="bg-success/15 text-success border-success/30 w-fit">
              Połączony ✓
            </Badge>
            {expiresAt && (
              <p className="text-sm text-muted-foreground">
                Token ważny do:{' '}
                <span className="font-medium text-foreground">
                  {new Date(expiresAt).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            )}
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="flex flex-col gap-2">
              <Badge className="bg-status-warning/15 text-status-warning-foreground border-status-warning/30 w-fit">
                Wygasł ⚠
              </Badge>
              <p className="text-sm text-muted-foreground">
                {messages.calendar.tokenExpiredExplanation}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/api/auth/google">Odnów połączenie</Link>
            </Button>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 w-fit">
              Niepołączony
            </Badge>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/api/auth/google">Połącz Google Calendar</Link>
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
