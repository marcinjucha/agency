import { google } from 'googleapis'

/**
 * Google Calendar OAuth token structure
 */
export interface GoogleCalendarToken {
  access_token: string
  refresh_token: string | null
  expiry_date: number
  scope: string
  token_type: string
  email: string | undefined
}

// ⚠️ MOCK MODE - Control via environment variable
// If GOOGLE_MOCK_MODE env var is missing or not set to 'true', use real OAuth
const USE_MOCK_OAUTH = process.env.GOOGLE_MOCK_MODE === 'true'

/**
 * Create OAuth2 client instance
 */
function createOAuthClient() {
  if (USE_MOCK_OAUTH) {
    // Return dummy client for mock mode
    return new google.auth.OAuth2('mock_client_id', 'mock_client_secret', 'mock_redirect_uri')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const hostUrl = process.env.HOST_URL
  const callbackPath = process.env.GOOGLE_CALLBACK_PATH

  if (!clientId) {
    console.error('❌ Missing environment variable: GOOGLE_CLIENT_ID')
    throw new Error('Missing GOOGLE_CLIENT_ID')
  }

  if (!clientSecret) {
    console.error('❌ Missing environment variable: GOOGLE_CLIENT_SECRET')
    throw new Error('Missing GOOGLE_CLIENT_SECRET')
  }

  if (!hostUrl) {
    console.error('❌ Missing environment variable: HOST_URL')
    throw new Error('Missing HOST_URL')
  }

  if (!callbackPath) {
    console.error('❌ Missing environment variable: GOOGLE_CALLBACK_PATH')
    throw new Error('Missing GOOGLE_CALLBACK_PATH')
  }

  const redirectUri = `${hostUrl}${callbackPath}`

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generate Google OAuth consent screen URL
 * User is redirected to this URL to grant calendar permissions
 */
export function getAuthUrl(userId: string, state: string): string {
  if (USE_MOCK_OAUTH) {
    // Mock: Create a simple mock code and redirect to callback
    const mockCode = `mock_code_${userId}_${Date.now()}`
    const hostUrl = process.env.HOST_URL
    const callbackPath = process.env.GOOGLE_CALLBACK_PATH

    if (!hostUrl) {
      console.error('❌ Missing environment variable: HOST_URL')
      throw new Error('Missing HOST_URL')
    }

    if (!callbackPath) {
      console.error('❌ Missing environment variable: GOOGLE_CALLBACK_PATH')
      throw new Error('Missing GOOGLE_CALLBACK_PATH')
    }

    const redirectUri = `${hostUrl}${callbackPath}`
    return `${redirectUri}?code=${mockCode}&state=${state}`
  }

  const oauth2Client = createOAuthClient()

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: ['https://www.googleapis.com/auth/calendar'],
    state,
    prompt: 'consent', // Force consent screen to ensure refresh token is returned
  })

  return authUrl
}

/**
 * Exchange authorization code for tokens
 * Called after user approves OAuth consent screen
 */
export async function handleCallback(
  code: string
): Promise<GoogleCalendarToken> {
  if (USE_MOCK_OAUTH) {
    // Mock: Return dummy tokens without calling Google
    return {
      access_token: `mock_access_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      expiry_date: Date.now() + 3600000,
      scope: 'https://www.googleapis.com/auth/calendar',
      token_type: 'Bearer',
      email: 'lawyer@example.com',
    }
  }

  try {
    const oauth2Client = createOAuthClient()

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('No access token returned from Google')
    }

    // Get user's email from Google API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    oauth2Client.setCredentials(tokens)

    const settings = await calendar.settings.list()
    const emailSetting = settings.data.items?.find(item => item.id === 'user')
    const email = emailSetting?.value

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || 0,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      email: email || undefined,
    }
  } catch (error) {
    throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Revoke Google Calendar access
 * User's calendar access is permanently revoked
 */
export async function revokeAccess(refreshToken: string): Promise<void> {
  if (USE_MOCK_OAUTH) {
    // Mock: Just return without doing anything
    return
  }

  try {
    const oauth2Client = createOAuthClient()

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    await oauth2Client.revokeCredentials()
  } catch (error) {
    // Log but don't throw - revocation might already be done
    console.error(
      `Warning: Failed to revoke access token: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
