import { Suspense } from 'react'
import { CalendarSettings } from '@/features/calendar/components/CalendarSettings'
import { CalendarTokenStatus } from '@/features/calendar/components/CalendarTokenStatus'
import { CalendarSettingsForm } from '@/features/calendar/components/CalendarSettingsForm'

// Mark as dynamic to avoid static generation issues with useSearchParams
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

      {/* Calendar Token Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading token status...</div>}>
          <CalendarTokenStatus />
        </Suspense>
      </div>

      {/* Calendar Settings Form */}
      <div className="bg-card rounded-lg border border-border p-6">
        <CalendarSettingsForm />
      </div>

      {/* Additional settings sections can be added below */}
    </div>
  )
}
