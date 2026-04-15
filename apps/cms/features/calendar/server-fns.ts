import { createServerFn } from '@tanstack/react-start'
import type { CalendarConnection } from '@agency/calendar'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'

// ---------------------------------------------------------------------------
// Auth helper (same pattern as surveys/server-fns.ts)
// ---------------------------------------------------------------------------

type StartClient = ReturnType<typeof createStartClient>

type AuthContext = {
  supabase: StartClient
  userId: string
  tenantId: string
}

async function getAuth(): Promise<AuthContext | null> {
  const supabase = createStartClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  return { supabase, userId: user.id, tenantId: userData.tenant_id }
}

// ---------------------------------------------------------------------------
// DB → domain mapping (inlined to avoid importing @agency/calendar runtime code)
// ---------------------------------------------------------------------------

function toCalendarConnection(row: Record<string, unknown>): CalendarConnection {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: (row.user_id as string) ?? null,
    provider: row.provider as CalendarConnection['provider'],
    displayName: row.display_name as string,
    credentials: row.credentials as CalendarConnection['credentials'],
    calendarUrl: (row.calendar_url as string) ?? null,
    accountIdentifier: (row.account_identifier as string) ?? null,
    isDefault: row.is_default as boolean,
    isActive: row.is_active as boolean,
  }
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

/**
 * Fetch all calendar connections for the current tenant.
 * Reads from the decrypted view — must stay server-side.
 */
export const getCalendarConnectionsFn = createServerFn()
  .handler(
    async (): Promise<{ success: true; data: CalendarConnection[] } | { success: false; error: string }> => {
      try {
        const auth = await getAuth()
        if (!auth) return { success: false, error: messages.common.notLoggedIn }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (auth.supabase as any)
          .from('calendar_connections_decrypted')
          .select('*')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true })

        if (error) {
          console.error('[calendar] getCalendarConnectionsFn failed:', error.message)
          return { success: false, error: messages.calendar.fetchConnectionsFailed }
        }

        return { success: true, data: (data ?? []).map(toCalendarConnection) }
      } catch (err) {
        const message = err instanceof Error ? err.message : messages.common.unknownError
        console.error('[calendar] getCalendarConnectionsFn failed:', message)
        return { success: false, error: messages.calendar.fetchConnectionsFailed }
      }
    }
  )

/**
 * Assign (or remove) a calendar connection for a survey link.
 * Pass null connectionId to disconnect.
 */
export const updateSurveyLinkCalendarFn = createServerFn()
  .inputValidator(
    (input: { surveyLinkId: string; connectionId: string | null }) => input
  )
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const auth = await getAuth()
        if (!auth) return { success: false, error: messages.common.notLoggedIn }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (auth.supabase as any)
          .from('survey_links')
          .update({ calendar_connection_id: data.connectionId })
          .eq('id', data.surveyLinkId)

        if (error) {
          return { success: false, error: messages.calendar.updateSurveyLinkCalendarFailed }
        }

        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : messages.common.unknownError
        console.error('[calendar] updateSurveyLinkCalendarFn failed:', message)
        return { success: false, error: messages.calendar.updateSurveyLinkCalendarFailed }
      }
    }
  )
