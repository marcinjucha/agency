import { CalendarSettings } from '@/features/calendar/components/CalendarSettings'
import { CalendarSettingsForm } from '@/features/calendar/components/CalendarSettingsForm'
import { messages } from '@/lib/messages'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">{messages.pages.settingsTitle}</h1>
        <p className="text-muted-foreground mt-2">
          {messages.pages.settingsDescription}
        </p>
      </div>

      {/* Calendar Settings Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <CalendarSettings />
      </div>

      {/* Calendar Settings Form */}
      <div className="bg-card rounded-lg border border-border p-6">
        <CalendarSettingsForm />
      </div>
    </div>
  )
}
