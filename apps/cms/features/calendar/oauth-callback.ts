import { createClient } from '@/lib/supabase/server'
import { handleCallback, revokeAccess } from '@/features/calendar/oauth'
import { cookies } from 'next/headers'
import { routes } from '@/lib/routes'

type CallbackResult =
  | { success: true; redirectPath: string }
  | { success: false; redirectPath: string }

interface CallbackParams {
  code: string | null
  state: string | null
  error: string | null
  errorDescription: string | null
}

/**
 * Core OAuth callback logic: validates params, verifies CSRF state,
 * exchanges code for tokens, saves to DB, cleans up cookies.
 *
 * Route handler owns HTTP concerns (parsing query params, building redirect URL).
 * This function owns business logic and returns a redirect path.
 */
export async function processOAuthCallback(
  params: CallbackParams
): Promise<CallbackResult> {
  const { code, state, error, errorDescription } = params

  // Step 1: Check for errors from Google (user denied access, etc)
  if (error) {
    const description = errorDescription || 'Unknown error'
    console.error('Google OAuth error:', error, description)
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=Google+OAuth+failed:+${encodeURIComponent(description)}`,
    }
  }

  // Step 2: Validate authorization code
  if (!code) {
    console.error('No authorization code returned from Google')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=No+authorization+code+received`,
    }
  }

  // Step 3: Verify state parameter (CSRF protection)
  if (!state) {
    console.error('No state parameter returned from Google')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=Invalid+OAuth+state`,
    }
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value

  if (!storedState || storedState !== state) {
    console.error('State mismatch - possible CSRF attack')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=OAuth+security+validation+failed`,
    }
  }

  // Step 4: Get authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      redirectPath: `${routes.login}?error=Session+expired`,
    }
  }

  // Step 5: Exchange authorization code for tokens
  let tokenData
  try {
    tokenData = await handleCallback(code)
  } catch (tokenError) {
    console.error('Token exchange failed:', tokenError)
    return {
      success: false,
      redirectPath:
        `${routes.admin.settings}?error=Failed+to+exchange+authorization+code`,
    }
  }

  // Step 6: Save tokens to users.google_calendar_token
  const { error: updateError } = await supabase
    .from('users')
    // @ts-expect-error - Supabase type inference issue with JSONB fields
    .update({ google_calendar_token: tokenData })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to save tokens:', updateError)
    // Try to revoke access since we couldn't save tokens
    if (tokenData.refresh_token) {
      await revokeAccess(tokenData.refresh_token)
    }
    return {
      success: false,
      redirectPath:
        `${routes.admin.settings}?error=Failed+to+save+calendar+connection`,
    }
  }

  // Step 7: Clear state cookie
  cookieStore.delete('google_oauth_state')

  return {
    success: true,
    redirectPath:
      `${routes.admin.settings}?success=Google+Calendar+connected+successfully`,
  }
}
