/**
 * Connection Manager
 *
 * Resolves CalendarConnection from DB (calendar_connections_decrypted view).
 * Accepts a Supabase client as parameter — the caller decides which client
 * (server, service_role, anon) to use based on context.
 *
 * Website booking flow uses service_role (no user session).
 * CMS uses authenticated server client (has user session).
 */

import { ok, err, ResultAsync, type Result } from 'neverthrow'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalendarConnection, ProviderType } from './types'

// ---------------------------------------------------------------------------
// Type for raw DB row from calendar_connections_decrypted view
// ---------------------------------------------------------------------------

interface DecryptedConnectionRow {
  id: string
  tenant_id: string
  user_id: string | null
  provider: string
  display_name: string
  credentials: unknown
  calendar_url: string | null
  account_identifier: string | null
  is_default: boolean
  is_active: boolean
}

// ---------------------------------------------------------------------------
// Row → domain model transform
// ---------------------------------------------------------------------------

function toCalendarConnection(row: DecryptedConnectionRow): CalendarConnection {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    provider: row.provider as ProviderType,
    displayName: row.display_name,
    credentials: row.credentials as CalendarConnection['credentials'],
    calendarUrl: row.calendar_url,
    accountIdentifier: row.account_identifier,
    isDefault: row.is_default,
    isActive: row.is_active,
  }
}

function mapDbError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message
  }
  return error instanceof Error ? error.message : 'Unknown database error'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the calendar connection for a specific survey link.
 *
 * Resolves survey_links.calendar_connection_id → fetches from decrypted view.
 * Returns err if survey link has no calendar connection (plain survey without booking).
 */
export function getConnectionForSurveyLink(
  surveyLinkId: string,
  supabase: SupabaseClient
): ResultAsync<CalendarConnection, string> {
  return ResultAsync.fromPromise(
    (async () => {
      // Step 1: Get calendar_connection_id from survey_links
      const { data: link, error: linkError } = await supabase
        .from('survey_links')
        .select('calendar_connection_id')
        .eq('id', surveyLinkId)
        .single()

      if (linkError) throw new Error(`Survey link not found: ${linkError.message}`)
      if (!link?.calendar_connection_id) {
        throw new Error('Survey link has no calendar connection configured')
      }

      // Step 2: Fetch decrypted connection
      const { data: connection, error: connError } = await supabase
        .from('calendar_connections_decrypted' as 'calendar_connections')
        .select('*')
        .eq('id', link.calendar_connection_id)
        .single()

      if (connError) throw new Error(`Calendar connection not found: ${connError.message}`)
      if (!connection) throw new Error('Calendar connection not found')

      return toCalendarConnection(connection as unknown as DecryptedConnectionRow)
    })(),
    mapDbError
  )
}

/**
 * Get all active calendar connections for the current tenant.
 */
export function getConnectionsForTenant(
  supabase: SupabaseClient
): ResultAsync<CalendarConnection[], string> {
  return ResultAsync.fromPromise(
    (async () => {
      const { data, error } = await supabase
        .from('calendar_connections_decrypted' as 'calendar_connections')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })

      if (error) throw new Error(`Failed to fetch connections: ${error.message}`)

      return (data as unknown as DecryptedConnectionRow[]).map(toCalendarConnection)
    })(),
    mapDbError
  )
}

/**
 * Get the tenant's default calendar connection (is_default=true, user_id IS NULL).
 */
export function getDefaultConnection(
  supabase: SupabaseClient
): ResultAsync<CalendarConnection, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const { data, error } = await supabase
        .from('calendar_connections_decrypted' as 'calendar_connections')
        .select('*')
        .eq('is_default', true)
        .is('user_id', null)
        .single()

      if (error) throw new Error(`No default calendar connection: ${error.message}`)
      if (!data) throw new Error('No default calendar connection found')

      return toCalendarConnection(data as unknown as DecryptedConnectionRow)
    })(),
    mapDbError
  )
}

/**
 * Get a specific calendar connection by ID.
 */
export function getConnectionById(
  connectionId: string,
  supabase: SupabaseClient
): ResultAsync<CalendarConnection, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const { data, error } = await supabase
        .from('calendar_connections_decrypted' as 'calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .single()

      if (error) throw new Error(`Calendar connection not found: ${error.message}`)
      if (!data) throw new Error('Calendar connection not found')

      return toCalendarConnection(data as unknown as DecryptedConnectionRow)
    })(),
    mapDbError
  )
}
