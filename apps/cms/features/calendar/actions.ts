'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import type { AuthSuccess } from '@/lib/auth'
import { createCalendarProvider, type CalendarConnection, type CalDAVCredentials } from '@agency/calendar'
import { caldavConnectionSchema } from './validation'
import { calendarSettingsSchema } from './validation'
import type { CalDAVConnectionFormValues, CalendarSettingsFormValues } from './types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// ---------------------------------------------------------------------------
// Server Actions (public API)
// ---------------------------------------------------------------------------

/**
 * Add a CalDAV calendar connection.
 *
 * Flow: validate form → test connection via CalDAV provider → discover calendars →
 * persist via upsert_calendar_connection RPC (pgcrypto encrypted).
 */
export async function addCalDAVConnection(
  data: CalDAVConnectionFormValues
): Promise<{ success: true; data: { connectionId: string } } | { success: false; error: string }> {
  try {
    const parsed = caldavConnectionSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    const { serverUrl, username, password, displayName } = parsed.data
    const credentials: CalDAVCredentials = { serverUrl, username, password }

    // Build a temporary CalendarConnection object for the provider factory
    const tempConnection: CalendarConnection = {
      id: 'temp',
      tenantId: auth.data.tenantId,
      userId: auth.data.userId,
      provider: 'caldav',
      displayName,
      credentials,
      calendarUrl: null,
      accountIdentifier: null,
      isDefault: false,
      isActive: true,
    }

    // Test connection before persisting
    const provider = createCalendarProvider(tempConnection)
    const testResult = await provider.testConnection()

    if (testResult.isErr()) {
      return { success: false, error: `${messages.calendar.testConnectionFailed}: ${testResult.error}` }
    }

    // Discover calendars — use first found calendar URL
    const discoverResult = await provider.discoverCalendars()
    const calendarUrl = discoverResult.isOk() && discoverResult.value.length > 0
      ? discoverResult.value[0].url
      : null

    // Persist via RPC (pgcrypto encrypted credentials)
    const connectionId = await upsertConnection(auth.data, {
      provider: 'caldav',
      displayName,
      credentials: { ...credentials, calendarUrl: calendarUrl ?? undefined },
      calendarUrl,
      accountIdentifier: `${username}@${new URL(serverUrl).hostname}`,
    })

    if (!connectionId) {
      return { success: false, error: messages.calendar.addConnectionFailed }
    }

    revalidatePath(routes.admin.settings)
    return { success: true, data: { connectionId } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] addCalDAVConnection failed:', message, err)
    return { success: false, error: `${messages.calendar.addConnectionFailed}: ${message}` }
  }
}

/**
 * Test an existing calendar connection (any provider).
 *
 * Fetches decrypted credentials from DB, creates provider, calls testConnection().
 */
export async function testCalendarConnection(
  connectionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    const connection = await fetchDecryptedConnection(auth.data.supabase, connectionId)
    if (!connection) {
      return { success: false, error: messages.calendar.connectionNotFound }
    }

    const provider = createCalendarProvider(connection, {
      onTokenRefresh: buildTokenRefreshCallback(auth.data.supabase),
    })

    const result = await provider.testConnection()
    if (result.isErr()) {
      return { success: false, error: `${messages.calendar.testConnectionFailed}: ${result.error}` }
    }

    // Update last_verified_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth.data.supabase as any)
      .from('calendar_connections')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', connectionId)

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] testCalendarConnection failed:', message)
    return { success: false, error: messages.calendar.testConnectionFailed }
  }
}

/**
 * Set a calendar connection as the tenant-level default.
 *
 * The upsert_calendar_connection RPC handles unsetting previous defaults,
 * but for an existing connection we just flip the boolean directly.
 */
export async function setDefaultConnection(
  connectionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Unset current defaults for tenant (tenant-level only, user_id IS NULL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('calendar_connections')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .is('user_id', null)
      .eq('is_default', true)

    // Set new default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('calendar_connections')
      .update({ is_default: true })
      .eq('id', connectionId)

    if (error) {
      return { success: false, error: messages.calendar.setDefaultFailed }
    }

    revalidatePath(routes.admin.settings)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] setDefaultConnection failed:', message)
    return { success: false, error: messages.calendar.setDefaultFailed }
  }
}

/**
 * Permanently remove a calendar connection.
 *
 * Also clears survey_links.calendar_connection_id FK references (ON DELETE SET NULL handles this).
 */
export async function removeConnection(
  connectionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (auth.data.supabase as any)
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)

    if (error) {
      return { success: false, error: messages.calendar.removeConnectionFailed }
    }

    revalidatePath(routes.admin.settings)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] removeConnection failed:', message)
    return { success: false, error: messages.calendar.removeConnectionFailed }
  }
}

/**
 * Deactivate a calendar connection (soft delete — set is_active=false).
 *
 * Keeps credentials in DB for potential reactivation.
 */
export async function disconnectCalendarConnection(
  connectionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (auth.data.supabase as any)
      .from('calendar_connections')
      .update({ is_active: false, is_default: false })
      .eq('id', connectionId)

    if (error) {
      return { success: false, error: messages.calendar.deactivateConnectionFailed }
    }

    revalidatePath(routes.admin.settings)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] disconnectCalendarConnection failed:', message)
    return { success: false, error: messages.calendar.deactivateConnectionFailed }
  }
}

/**
 * Update which calendar connection a survey link uses for booking.
 *
 * Pass null to disconnect the calendar from a survey link.
 */
export async function updateSurveyLinkCalendar(
  surveyLinkId: string,
  connectionId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- calendar_connection_id not in generated types yet
    const { error } = await (auth.data.supabase as any)
      .from('survey_links')
      .update({ calendar_connection_id: connectionId })
      .eq('id', surveyLinkId)

    if (error) {
      return { success: false, error: messages.calendar.updateSurveyLinkCalendarFailed }
    }

    revalidatePath(routes.admin.surveys)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] updateSurveyLinkCalendar failed:', message)
    return { success: false, error: messages.calendar.updateSurveyLinkCalendarFailed }
  }
}

/**
 * Get all calendar connections for the current tenant (decrypted view).
 *
 * Server Action because it reads encrypted credentials that should not
 * be exposed to the browser client — TanStack Query fetches via this action.
 */
export async function getCalendarConnections(): Promise<
  { success: true; data: CalendarConnection[] } | { success: false; error: string }
> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    const connections = await fetchTenantConnections(auth.data.supabase)
    return { success: true, data: connections }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[calendar] getCalendarConnections failed:', message)
    return { success: false, error: messages.calendar.fetchConnectionsFailed }
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

    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    const { error } = await auth.data.supabase
      .from('calendar_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ user_id: auth.data.userId, ...data } as any, { onConflict: 'user_id' })

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

// ---------------------------------------------------------------------------
// DB helpers (feature-local)
// ---------------------------------------------------------------------------

type SupabaseClient = AuthSuccess['supabase']

interface UpsertConnectionParams {
  provider: 'google' | 'caldav'
  displayName: string
  credentials: Record<string, unknown>
  calendarUrl: string | null
  accountIdentifier: string | null
}

/**
 * Calls the upsert_calendar_connection RPC (SECURITY DEFINER) for encrypted credential storage.
 * Returns the connection UUID on success, null on failure.
 */
async function upsertConnection(
  auth: AuthSuccess,
  params: UpsertConnectionParams
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any).rpc('upsert_calendar_connection', {
    p_tenant_id: auth.tenantId,
    p_user_id: auth.userId,
    p_provider: params.provider,
    p_display_name: params.displayName,
    p_credentials_json: JSON.stringify(params.credentials),
    p_calendar_url: params.calendarUrl,
    p_account_identifier: params.accountIdentifier,
    p_is_default: false,
  })

  if (error) {
    console.error('[calendar] upsert_calendar_connection RPC failed:', error.message)
    return null
  }

  return data as string
}

/**
 * Fetch a single decrypted connection by ID.
 * Used for testConnection — needs decrypted credentials.
 */
async function fetchDecryptedConnection(
  supabase: SupabaseClient,
  connectionId: string
): Promise<CalendarConnection | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('calendar_connections_decrypted')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error || !data) return null

  return toCalendarConnection(data)
}

/**
 * Fetch all active connections for the user's tenant (decrypted).
 */
async function fetchTenantConnections(
  supabase: SupabaseClient
): Promise<CalendarConnection[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('calendar_connections_decrypted')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[calendar] fetchTenantConnections failed:', error.message)
    return []
  }

  return (data ?? []).map(toCalendarConnection)
}

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

/**
 * Transform raw DB row from calendar_connections_decrypted view
 * into the CalendarConnection domain model.
 */
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

/**
 * Build a token refresh callback for Google provider.
 * Called when Google access token is refreshed — persists new credentials via RPC.
 */
function buildTokenRefreshCallback(
  supabase: SupabaseClient
): (connectionId: string, newCredentials: import('@agency/calendar').GoogleCredentials) => Promise<void> {
  return async (connectionId, newCredentials) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('update_calendar_credentials', {
      p_connection_id: connectionId,
      p_credentials_json: JSON.stringify(newCredentials),
    })

    if (error) {
      console.error('[calendar] Token refresh callback failed:', error.message)
    }
  }
}
