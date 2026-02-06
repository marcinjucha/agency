import { createClient } from '@/lib/supabase/server'
import { handleCallback, revokeAccess } from '@/lib/google-calendar/oauth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Tables } from '@agency/database'

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google
 * Exchanges authorization code for tokens and stores them in database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Step 1: Check for errors from Google (user denied access, etc)
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error'
      console.error('Google OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(
          `/admin/settings?error=Google+OAuth+failed:+${encodeURIComponent(errorDescription)}`,
          request.url
        )
      )
    }

    // Step 2: Validate authorization code
    if (!code) {
      console.error('No authorization code returned from Google')
      return NextResponse.redirect(
        new URL('/admin/settings?error=No+authorization+code+received', request.url)
      )
    }

    // Step 3: Verify state parameter (CSRF protection)
    if (!state) {
      console.error('No state parameter returned from Google')
      return NextResponse.redirect(
        new URL('/admin/settings?error=Invalid+OAuth+state', request.url)
      )
    }

    const cookieStore = await cookies()
    const storedState = cookieStore.get('google_oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack')
      return NextResponse.redirect(
        new URL('/admin/settings?error=OAuth+security+validation+failed', request.url)
      )
    }

    // Step 4: Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=Session+expired', request.url)
      )
    }

    // Step 5: Exchange authorization code for tokens
    let tokenData
    try {
      tokenData = await handleCallback(code)
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError)
      return NextResponse.redirect(
        new URL(
          '/admin/settings?error=Failed+to+exchange+authorization+code',
          request.url
        )
      )
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
      return NextResponse.redirect(
        new URL('/admin/settings?error=Failed+to+save+calendar+connection', request.url)
      )
    }

    // Step 7: Clear state cookie (no longer needed)
    cookieStore.delete('google_oauth_state')

    // Step 8: Redirect to settings with success message
    const response = NextResponse.redirect(
      new URL('/admin/settings?success=Google+Calendar+connected+successfully', request.url)
    )

    // Clear the state cookie in response
    response.cookies.delete('google_oauth_state')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/admin/settings?error=Internal+server+error', request.url)
    )
  }
}
