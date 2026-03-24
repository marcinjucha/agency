/**
 * Calendar Settings Cache
 *
 * In-memory cache for per-user calendar settings (work hours, slot duration, buffer).
 * Uses service-role Supabase client — this runs in a public API route with no auth context.
 *
 * @module apps/website/features/calendar/settings-cache
 */

import { createClient } from '@supabase/supabase-js'

// Defaults when no DB row exists for the user
const DEFAULT_WORK_START_HOUR = 9
const DEFAULT_WORK_END_HOUR = 17
const DEFAULT_SLOT_DURATION_MINUTES = 60
const DEFAULT_BUFFER_MINUTES = 15

export interface CalendarSettings {
  work_start_hour: number
  work_end_hour: number
  slot_duration_minutes: number
  buffer_minutes: number
}

// Simple in-memory cache: userId -> { settings, cachedAt }
const calendarSettingsCache = new Map<string, {
  settings: CalendarSettings
  cachedAt: number
}>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Get calendar settings for a user, with 5-minute in-memory cache.
 * Falls back to defaults if no DB row exists.
 */
export async function getCalendarSettingsForUser(userId: string): Promise<CalendarSettings> {
  const cached = calendarSettingsCache.get(userId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.settings
  }

  const supabase = getServiceClient()

  const { data } = await supabase
    .from('calendar_settings')
    .select('work_start_hour, work_end_hour, slot_duration_minutes, buffer_minutes')
    .eq('user_id', userId)
    .single()

  const settings: CalendarSettings = data ?? {
    work_start_hour: DEFAULT_WORK_START_HOUR,
    work_end_hour: DEFAULT_WORK_END_HOUR,
    slot_duration_minutes: DEFAULT_SLOT_DURATION_MINUTES,
    buffer_minutes: DEFAULT_BUFFER_MINUTES,
  }

  calendarSettingsCache.set(userId, { settings, cachedAt: Date.now() })
  return settings
}
