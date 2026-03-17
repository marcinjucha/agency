import { Badge, Button, Card } from '@agency/ui'
import Link from 'next/link'
import { getCalendarTokenStatus } from '../actions'

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
            <Badge className="bg-green-100 text-green-800 border-green-200 w-fit">
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
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 w-fit">
              Wygasł ⚠
            </Badge>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/api/auth/google">Odnów połączenie</Link>
            </Button>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <Badge className="bg-red-100 text-red-800 border-red-200 w-fit">
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
