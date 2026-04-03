'use server'

import { createClient } from '@/lib/supabase/server'
import { revokeAccess } from '@/features/calendar/oauth'
import { revalidatePath } from 'next/cache'
import { getValidAccessToken, refreshAccessToken } from '@agency/calendar'
import type { GoogleCalendarToken } from '@/features/calendar/oauth'
import type { CalendarSettingsFormValues } from './types'
import { calendarSettingsSchema } from './validation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

/**
 * Get Google Calendar connection status
 * Returns whether user has connected Google Calendar and their email
 */
export async function getGoogleCalendarStatus(): Promise<{
  connected: boolean
  email?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { connected: false, error: messages.common.notLoggedIn }
    }

    // Get user's google_calendar_token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      return { connected: false, error: messages.calendar.fetchSettingsFailed }
    }

    const tokenData = (userData as unknown as { google_calendar_token: unknown })?.google_calendar_token

    if (!tokenData) {
      return { connected: false }
    }

    const token = tokenData as GoogleCalendarToken

    return {
      connected: true,
      email: token.email,
    }
  } catch (error) {
    console.error('Error fetching calendar status:', error)
    return { connected: false, error: messages.calendar.fetchStatusFailed }
  }
}

/**
 * Disconnect Google Calendar
 * Revokes access and removes tokens from database
 */
export async function disconnectGoogleCalendar(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: messages.common.notLoggedIn }
    }

    // Get current tokens for revocation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      return { success: false, error: messages.calendar.fetchSettingsFailed }
    }

    // Revoke access with Google if refresh token exists
    const tokenData = (userData as unknown as { google_calendar_token: unknown })?.google_calendar_token
    if (tokenData) {
      const token = tokenData as GoogleCalendarToken
      if (token.refresh_token) {
        try {
          await revokeAccess(token.refresh_token)
        } catch (revokeError) {
          console.error('Failed to revoke Google access:', revokeError)
          // Continue anyway - we still want to clear the token locally
        }
      }
    }

    // Clear tokens from database
    const { error: updateError } = await supabase
      .from('users')
      // @ts-expect-error - Supabase type inference issue with JSONB fields
      .update({ google_calendar_token: null })
      .eq('id', user.id)

    if (updateError) {
      return {
        success: false,
        error: updateError.message || messages.calendar.disconnectFailed,
      }
    }

    revalidatePath(routes.admin.settings)
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    return { success: false, error: messages.calendar.disconnectFailed }
  }
}

/**
 * Upsert calendar settings for the current user.
 * Conflict target: user_id (one settings row per user).
 */
export async function updateCalendarSettings(
  data: CalendarSettingsFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = calendarSettingsSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message }
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: messages.common.notLoggedIn }
    }

    const { error } = await supabase
      .from('calendar_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ user_id: user.id, ...data } as any, { onConflict: 'user_id' })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(routes.admin.settings)
    return { success: true }
  } catch (error) {
    console.error('Error updating calendar settings:', error)
    return { success: false, error: messages.calendar.updateSettingsFailed }
  }
}

/**
 * Returns the Google Calendar token connection status for the current user.
 * connected  = valid token with refresh_token and future expiry
 * expired    = token exists but expired or missing refresh_token
 * disconnected = no token stored
 */
export async function getCalendarTokenStatus(): Promise<{
  status: 'connected' | 'expired' | 'disconnected'
  expiresAt: string | null
  hasRefreshToken: boolean
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { status: 'disconnected', expiresAt: null, hasRefreshToken: false }
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return { status: 'disconnected', expiresAt: null, hasRefreshToken: false }
    }

    const tokenData = (userData as unknown as { google_calendar_token: unknown })?.google_calendar_token

    if (!tokenData) {
      return { status: 'disconnected', expiresAt: null, hasRefreshToken: false }
    }

    const token = tokenData as GoogleCalendarToken
    const hasRefreshToken = !!token.refresh_token
    const expiresAt = token.expiry_date
      ? new Date(token.expiry_date).toISOString()
      : null
    const isExpired = !expiresAt || new Date(expiresAt) <= new Date()

    // No refresh_token → cannot recover, needs reconnect
    if (!hasRefreshToken) {
      return { status: 'expired', expiresAt, hasRefreshToken }
    }

    // Access token expired → attempt refresh to detect revoked tokens
    // Only when expiry_date is in the past (not on every page load)
    if (isExpired) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getValidAccessToken(user.id, supabase as any, refreshAccessToken)
      if (result.error === 'token_revoked') {
        return { status: 'expired', expiresAt, hasRefreshToken }
      }
      // Transient failure or success — treat as connected
      // (refresh succeeded or will succeed on next real API call)
    }

    return { status: 'connected', expiresAt, hasRefreshToken }
  } catch (error) {
    console.error('Error fetching calendar token status:', error)
    return { status: 'disconnected', expiresAt: null, hasRefreshToken: false }
  }
}
