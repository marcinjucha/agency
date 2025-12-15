'use server'

import { createClient } from '@/lib/supabase/server'
import { revokeAccess } from '@/lib/google-calendar/oauth'
import { revalidatePath } from 'next/cache'
import type { GoogleCalendarToken } from '@/lib/google-calendar/oauth'

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
      return { connected: false, error: 'Not authenticated' }
    }

    // Get user's google_calendar_token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      return { connected: false, error: 'Failed to fetch settings' }
    }

    const tokenData = (userData as any)?.google_calendar_token

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
    return { connected: false, error: 'Failed to fetch calendar status' }
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
      return { success: false, error: 'Not authenticated' }
    }

    // Get current tokens for revocation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      return { success: false, error: 'Failed to fetch settings' }
    }

    // Revoke access with Google if refresh token exists
    const tokenData = (userData as any)?.google_calendar_token
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
        error: updateError.message || 'Failed to disconnect calendar',
      }
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    return { success: false, error: 'Failed to disconnect calendar' }
  }
}
