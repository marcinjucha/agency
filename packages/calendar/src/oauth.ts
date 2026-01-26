import { google } from 'googleapis'

/**
 * Refresh expired Google OAuth access token
 *
 * This function is exported from the calendar package so both apps can use it.
 * Requires Google OAuth credentials in environment variables.
 *
 * @param refreshToken - The refresh token from database
 * @returns New access token
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  // Check for mock mode
  const USE_MOCK_OAUTH = process.env.GOOGLE_MOCK_MODE === 'true'

  if (USE_MOCK_OAUTH) {
    // Mock: Return new mock token
    return `mock_access_${Date.now()}`
  }

  try {
    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const hostUrl = process.env.HOST_URL
    const callbackPath = process.env.GOOGLE_CALLBACK_PATH

    if (!clientId || !clientSecret || !hostUrl || !callbackPath) {
      throw new Error('Missing Google OAuth environment variables')
    }

    const redirectUri = `${hostUrl}${callbackPath}`
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('No access token returned from refresh')
    }

    return credentials.access_token
  } catch (error) {
    throw new Error(
      `Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
