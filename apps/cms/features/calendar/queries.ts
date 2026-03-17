import { createClient } from '@/lib/supabase/client'
import { CALENDAR_SETTINGS_DEFAULTS } from './types'
import type { CalendarSettingsFormValues } from './types'

// Fetches calendar settings for current user. Returns defaults if no row exists.
// Used with TanStack Query in CalendarSettingsForm
export async function getCalendarSettings(): Promise<CalendarSettingsFormValues> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('calendar_settings')
    .select('work_start_hour, work_end_hour, slot_duration_minutes, buffer_minutes')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return { ...CALENDAR_SETTINGS_DEFAULTS }

  // Cast needed: Supabase JS v2 returns `never` for tables not yet in generated types
  const row = data as unknown as CalendarSettingsFormValues
  return {
    work_start_hour: row.work_start_hour,
    work_end_hour: row.work_end_hour,
    slot_duration_minutes: row.slot_duration_minutes,
    buffer_minutes: row.buffer_minutes,
  }
}
