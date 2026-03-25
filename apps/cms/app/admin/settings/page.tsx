import { CalendarSettings } from '@/features/calendar/components/CalendarSettings'
import { CalendarSettingsForm } from '@/features/calendar/components/CalendarSettingsForm'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and integrations
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
