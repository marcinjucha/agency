'use client'

import { CalendarSettings } from '@/features/calendar/components/CalendarSettings'

// Mark as dynamic to avoid static generation issues with useSearchParams
export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account and integrations
        </p>
      </div>

      {/* Calendar Settings Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CalendarSettings />
      </div>

      {/* Additional settings sections can be added below */}
    </div>
  )
}
