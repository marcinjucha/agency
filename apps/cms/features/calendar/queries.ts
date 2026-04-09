import { createClient } from '@/lib/supabase/client'
import { CALENDAR_SETTINGS_DEFAULTS } from './types'
import type { CalendarSettingsFormValues } from './types'
import { queryKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Calendar Settings (browser client — TanStack Query)
// ---------------------------------------------------------------------------

export const calendarSettingsQuery = {
  queryKey: queryKeys.calendar.settings,
  queryFn: getCalendarSettings,
}

export async function getCalendarSettings(): Promise<CalendarSettingsFormValues> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
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

// ---------------------------------------------------------------------------
// Calendar Connections (via Server Action — credentials must stay server-side)
// ---------------------------------------------------------------------------

/**
 * Calendar connections are fetched via the getCalendarConnections Server Action
 * (in actions.ts) because they contain encrypted credentials that must not
 * be exposed through the browser Supabase client.
 *
 * Usage with TanStack Query:
 *
 *   import { getCalendarConnections } from '../actions'
 *   import { calendarConnectionsQuery } from '../queries'
 *
 *   const { data } = useQuery({
 *     ...calendarConnectionsQuery,
 *     queryFn: async () => {
 *       const result = await getCalendarConnections()
 *       if (!result.success) throw new Error(result.error)
 *       return result.data
 *     },
 *   })
 */
export const calendarConnectionsQuery = {
  queryKey: queryKeys.calendar.connections,
}

// ---------------------------------------------------------------------------
// Survey Link Calendar Assignment (browser client — TanStack Query)
// ---------------------------------------------------------------------------

export function surveyLinkCalendarQuery(surveyLinkId: string) {
  return {
    queryKey: ['survey-link-calendar', surveyLinkId] as const,
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('survey_links')
        .select('id, calendar_connection_id')
        .eq('id', surveyLinkId)
        .single()

      if (error) throw error
      return data as { id: string; calendar_connection_id: string | null }
    },
  }
}
