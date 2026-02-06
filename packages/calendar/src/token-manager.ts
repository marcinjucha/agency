import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Google Calendar token structure stored in database
 */
interface GoogleCalendarToken {
  access_token: string
  refresh_token: string
  expiry_date: number // Unix timestamp in milliseconds (from Google OAuth)
  scope: string
  token_type?: string
  email?: string
}

/**
 * Result type for token operations (structured return pattern)
 */
export type TokenResult =
  | { accessToken: string; error?: never }
  | { accessToken?: never; error: string }

/**
 * Time buffer before token expiry (5 minutes in seconds)
 */
const TOKEN_EXPIRY_BUFFER = 300

/**
 * Get valid access token for user's Google Calendar
 *
 * Checks token expiry and automatically refreshes if expired or expiring soon.
 * Uses 5-minute buffer to prevent race conditions.
 *
 * @param userId - User ID to fetch token for
 * @param supabase - Supabase client (Browser or Server)
 * @param refreshAccessToken - Function to refresh token (imported from oauth.ts)
 * @returns TokenResult with accessToken or error
 *
 * @example
 * // Server Action usage
 * const supabase = await createClient() // Server client
 * const result = await getValidAccessToken(userId, supabase, refreshAccessToken)
 * if (result.error) {
 *   return { success: false, error: result.error }
 * }
 * // Use result.accessToken for API call
 *
 * @example
 * // TanStack Query usage (CMS)
 * const supabase = createClient() // Browser client
 * const result = await getValidAccessToken(userId, supabase, refreshAccessToken)
 * if (result.error) throw new Error(result.error)
 * // Use result.accessToken
 */
export async function getValidAccessToken(
  userId: string,
  supabase: SupabaseClient<Database>,
  refreshAccessToken: (refreshToken: string) => Promise<string>
): Promise<TokenResult> {
  try {
    // 1. Fetch user's token from database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[TOKEN MANAGER] Failed to fetch user token:', fetchError.message)
      return { error: 'Failed to fetch user token' }
    }

    // 2. Check if token exists
    const token = user?.google_calendar_token as GoogleCalendarToken | null
    if (!token || !token.access_token || !token.refresh_token) {
      console.error('[TOKEN MANAGER] No calendar connected for user')
      return { error: 'No calendar connected' }
    }

    // 3. Check expiry with 5-minute buffer
    const nowMs = Date.now()
    const expiryDateMs = token.expiry_date
    const msUntilExpiry = expiryDateMs - nowMs
    const isExpired = msUntilExpiry < TOKEN_EXPIRY_BUFFER * 1000 // Convert buffer to ms

    // 4. If expired or expiring soon, refresh token
    if (isExpired) {
      try {
        const newAccessToken = await refreshAccessToken(token.refresh_token)

        // Calculate new expiry (Google tokens expire in 1 hour = 3600000 ms)
        const newExpiryDate = Date.now() + 3600000 // +1 hour in milliseconds

        // Update database with new token
        const { error: updateError } = await supabase
          .from('users')
          .update({
            google_calendar_token: {
              access_token: newAccessToken,
              refresh_token: token.refresh_token, // Keep same refresh token
              expiry_date: newExpiryDate,
              scope: token.scope,
              token_type: token.token_type || 'Bearer',
              email: token.email,
            },
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[TOKEN MANAGER] Failed to update token in database:', updateError.message)
          return { error: 'Failed to save refreshed token' }
        }

        return { accessToken: newAccessToken }
      } catch (refreshError) {
        const errorMsg = refreshError instanceof Error ? refreshError.message : String(refreshError)
        console.error('[TOKEN MANAGER] Token refresh failed:', errorMsg)
        return { error: 'Token refresh failed' }
      }
    }

    // 5. Token is fresh, return existing access token
    return { accessToken: token.access_token }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[TOKEN MANAGER] Internal error:', errorMsg)
    return { error: 'Internal error fetching token' }
  }
}
