import { processOAuthCallback } from '@/features/calendar/oauth-callback'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/google/callback
 * Handles the OAuth redirect from Google.
 * Business logic delegated to features/calendar/oauth-callback.ts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const result = await processOAuthCallback({
      code: searchParams.get('code'),
      state: searchParams.get('state'),
      error: searchParams.get('error'),
      errorDescription: searchParams.get('error_description'),
    })

    const response = NextResponse.redirect(
      new URL(result.redirectPath, request.url)
    )

    // Clear OAuth state cookie on every callback (success or failure)
    response.cookies.delete('google_oauth_state')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/admin/settings?error=Internal+server+error', request.url)
    )
  }
}
