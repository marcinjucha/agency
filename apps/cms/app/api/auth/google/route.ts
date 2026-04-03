import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/features/calendar/oauth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/google
 * Initiates the Google OAuth flow
 * Redirects user to Google consent screen
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Generate CSRF state parameter
    const state = crypto.randomUUID()

    // Step 3: Store state in httpOnly cookie for CSRF verification
    // Cookie will be checked in callback route
    const cookieStore = await cookies()
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes - state expires after this time
      path: '/',
    })

    // Step 4: Generate Google OAuth URL
    const authUrl = getAuthUrl(user.id, state)

    // Step 5: Redirect to Google
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
