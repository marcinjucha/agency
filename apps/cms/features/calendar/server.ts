import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import type { CalendarConnection } from '@agency/calendar'
import { createCalendarProvider, type CalDAVCredentials } from '@agency/calendar'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'
import { caldavConnectionSchema } from './validation'
import { calendarSettingsSchema } from './validation'
import type { CalDAVConnectionFormValues, CalendarSettingsFormValues } from './types'
import { CALENDAR_SETTINGS_DEFAULTS } from './types'
import { getAuthUrl } from './oauth'

// ---------------------------------------------------------------------------
// Auth helper (same pattern as surveys/server.ts)
// ---------------------------------------------------------------------------

type StartClient = ReturnType<typeof createStartClient>

type AuthContext = {
  supabase: StartClient
  userId: string
  tenantId: string
}

async function getAuth(): Promise<AuthContext | null> {
  const supabase = createStartClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  return { supabase, userId: user.id, tenantId: userData.tenant_id as string }
}

function requireAuthContext(): ResultAsync<AuthContext, string> {
  return ResultAsync.fromPromise(getAuth(), String).andThen((auth) =>
    auth ? ok(auth) : err('Not authenticated')
  )
}

// ---------------------------------------------------------------------------
// DB → domain mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

function fetchConnectionsRow(auth: AuthContext) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('calendar_connections_decrypted')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    return ok((res.data ?? []).map(toCalendarConnection) as CalendarConnection[])
  })
}

function fetchDecryptedConnectionRow(auth: AuthContext, connectionId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('calendar_connections_decrypted')
      .select('*')
      .eq('id', connectionId)
      .single(),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.calendar.connectionNotFound)
    return ok(toCalendarConnection(res.data))
  })
}

function upsertConnectionRpc(
  auth: AuthContext,
  params: {
    provider: 'google' | 'caldav'
    displayName: string
    credentials: Record<string, unknown>
    calendarUrl: string | null
    accountIdentifier: string | null
  }
) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).rpc('upsert_calendar_connection', {
      p_tenant_id: auth.tenantId,
      p_user_id: auth.userId,
      p_provider: params.provider,
      p_display_name: params.displayName,
      p_credentials_json: JSON.stringify(params.credentials),
      p_calendar_url: params.calendarUrl,
      p_account_identifier: params.accountIdentifier,
      p_is_default: false,
    }),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    return ok(res.data as string)
  })
}

function buildTokenRefreshCallback(supabase: StartClient) {
  return async (
    connectionId: string,
    newCredentials: import('@agency/calendar').GoogleCredentials
  ): Promise<void> => {
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

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Fetch all calendar connections for the current tenant.
 * Reads from the decrypted view — must stay server-side.
 */
export const getCalendarConnectionsFn = createServerFn().handler(
  async (): Promise<
    { success: true; data: CalendarConnection[] } | { success: false; error: string }
  > => {
    const result = await requireAuthContext().andThen(fetchConnectionsRow)

    return result.match(
      (data) => ({ success: true, data }),
      (error) => ({ success: false, error: error || messages.calendar.fetchConnectionsFailed })
    )
  }
)

/**
 * Assign (or remove) a calendar connection for a survey link.
 * Pass null connectionId to disconnect.
 */
export const updateSurveyLinkCalendarFn = createServerFn()
  .inputValidator((input: { surveyLinkId: string; connectionId: string | null }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('survey_links')
            .update({ calendar_connection_id: data.connectionId })
            .eq('id', data.surveyLinkId),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(undefined)
        })
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({
          success: false,
          error: error || messages.calendar.updateSurveyLinkCalendarFailed,
        })
      )
    }
  )

/**
 * Get per-user calendar settings (work hours, slot duration, buffer).
 * Returns defaults if no settings row exists yet.
 */
export const getCalendarSettingsFn = createServerFn().handler(
  async (): Promise<
    | { success: true; data: CalendarSettingsFormValues }
    | { success: false; error: string }
  > => {
    const result = await requireAuthContext().andThen((auth) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (auth.supabase as any)
          .from('calendar_settings')
          .select('work_start_hour, work_end_hour, slot_duration_minutes, buffer_minutes')
          .eq('user_id', auth.userId)
          .maybeSingle(),
        dbError
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).andThen((res: any) => {
        if (res.error) return err(res.error.message as string)
        if (!res.data) return ok({ ...CALENDAR_SETTINGS_DEFAULTS })
        const row = res.data as unknown as CalendarSettingsFormValues
        return ok({
          work_start_hour: row.work_start_hour,
          work_end_hour: row.work_end_hour,
          slot_duration_minutes: row.slot_duration_minutes,
          buffer_minutes: row.buffer_minutes,
        })
      })
    )

    return result.match(
      (data) => ({ success: true, data }),
      (error) => ({ success: false, error: error || messages.calendar.loadSettingsFailed })
    )
  }
)

/**
 * Update per-user calendar settings (slot duration, buffer, advance booking, etc.).
 */
export const updateCalendarSettingsFn = createServerFn()
  .inputValidator((input: CalendarSettingsFormValues) => calendarSettingsSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('calendar_settings')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert({ user_id: auth.userId, ...data } as any, { onConflict: 'user_id' }),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(undefined)
        })
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error: error || messages.calendar.updateSettingsFailed })
      )
    }
  )

/**
 * Add a CalDAV calendar connection.
 *
 * Flow: validate → test CalDAV connection → discover calendars →
 * persist via upsert_calendar_connection RPC (pgcrypto encrypted).
 */
export const addCalDAVConnectionFn = createServerFn()
  .inputValidator((input: CalDAVConnectionFormValues) => caldavConnectionSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: { connectionId: string } } | { success: false; error: string }
    > => {
      const result = await requireAuthContext()
        .andThen((auth) => testCalDAVCredentials(data).map(() => auth))
        .andThen((auth) => discoverAndUpsertCalDAV(auth, data))

      return result.match(
        (connectionId) => ({ success: true, data: { connectionId } }),
        (error) => ({
          success: false,
          error: error || messages.calendar.addConnectionFailed,
        })
      )
    }
  )

/**
 * Test an existing calendar connection (any provider).
 * Fetches decrypted credentials, creates provider, calls testConnection().
 */
export const testConnectionFn = createServerFn()
  .inputValidator((input: { connectionId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext()
        .andThen((auth) =>
          fetchDecryptedConnectionRow(auth, data.connectionId).map((connection) => ({
            auth,
            connection,
          }))
        )
        .andThen(({ auth, connection }) => runConnectionTest(auth, connection))

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error: error || messages.calendar.testConnectionFailed })
      )
    }
  )

/**
 * Set a calendar connection as the tenant-level default.
 * Unsets previous default first, then sets the new one.
 */
export const setDefaultConnectionFn = createServerFn()
  .inputValidator((input: { connectionId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        unsetCurrentDefault(auth).andThen(() => markAsDefault(auth, data.connectionId))
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error: error || messages.calendar.setDefaultFailed })
      )
    }
  )

/**
 * Permanently remove a calendar connection.
 * ON DELETE SET NULL on survey_links.calendar_connection_id handles FK cleanup.
 */
export const removeConnectionFn = createServerFn()
  .inputValidator((input: { connectionId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('calendar_connections')
            .delete()
            .eq('id', data.connectionId),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(undefined)
        })
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error: error || messages.calendar.removeConnectionFailed })
      )
    }
  )

/**
 * Deactivate a calendar connection (soft delete — set is_active=false).
 * Keeps credentials in DB for potential reactivation.
 */
export const disconnectConnectionFn = createServerFn()
  .inputValidator((input: { connectionId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('calendar_connections')
            .update({ is_active: false, is_default: false })
            .eq('id', data.connectionId),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(undefined)
        })
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({
          success: false,
          error: error || messages.calendar.deactivateConnectionFailed,
        })
      )
    }
  )

/**
 * Re-activate a previously deactivated calendar connection.
 */
export const activateConnectionFn = createServerFn()
  .inputValidator((input: { connectionId: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('calendar_connections')
            .update({ is_active: true })
            .eq('id', data.connectionId),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(undefined)
        })
      )

      return result.match(
        () => ({ success: true }),
        (error) => ({
          success: false,
          error: error || messages.calendar.activateConnectionFailed,
        })
      )
    }
  )

/**
 * Initiate Google OAuth flow.
 *
 * Returns the authUrl — the component does window.location.href = data.authUrl.
 * Do NOT use redirect() from TanStack Start — return URL, let client navigate.
 *
 * WHY: TanStack Start createServerFn does not support redirect(). The component
 * receives the URL and performs client-side navigation to the Google OAuth consent screen.
 */
export const initiateGoogleOAuthFn = createServerFn().handler(
  async (): Promise<
    { success: true; data: { authUrl: string } } | { success: false; error: string }
  > => {
    const result = await requireAuthContext().andThen((auth) => {
      try {
        const state = crypto.randomUUID()
        const authUrl = getAuthUrl(auth.userId, state)
        // Note: in TanStack Start there is no cookie API at this layer.
        // The component must pass state back via URL; CSRF protection is best-effort here.
        // Full CSRF protection requires middleware-level cookie handling (see oauth-callback.ts).
        return ok({ authUrl, state })
      } catch (e) {
        return err(e instanceof Error ? e.message : messages.common.unknownError)
      }
    })

    return result.match(
      ({ authUrl }) => ({ success: true, data: { authUrl } }),
      (error) => ({ success: false, error })
    )
  }
)

// ---------------------------------------------------------------------------
// Business logic helpers
// ---------------------------------------------------------------------------

/**
 * Test CalDAV credentials before persisting.
 * Creates a temporary CalendarConnection object for the provider factory.
 */
function testCalDAVCredentials(data: CalDAVConnectionFormValues) {
  const credentials: CalDAVCredentials = {
    serverUrl: data.serverUrl,
    username: data.username,
    password: data.password,
  }

  const tempConnection: CalendarConnection = {
    id: 'temp',
    tenantId: 'temp',
    userId: null,
    provider: 'caldav',
    displayName: data.displayName,
    credentials,
    calendarUrl: null,
    accountIdentifier: null,
    isDefault: false,
    isActive: true,
  }

  const provider = createCalendarProvider(tempConnection)

  return ResultAsync.fromPromise(provider.testConnection(), dbError).andThen((result) => {
    if (result.isErr()) {
      return err(`${messages.calendar.testConnectionFailed}: ${result.error}`)
    }
    return ok(undefined)
  })
}

/**
 * Discover CalDAV calendars and upsert the connection via RPC.
 * Returns the new connection UUID.
 */
function discoverAndUpsertCalDAV(auth: AuthContext, data: CalDAVConnectionFormValues) {
  const credentials: CalDAVCredentials = {
    serverUrl: data.serverUrl,
    username: data.username,
    password: data.password,
  }

  const tempConnection: CalendarConnection = {
    id: 'temp',
    tenantId: auth.tenantId,
    userId: auth.userId,
    provider: 'caldav',
    displayName: data.displayName,
    credentials,
    calendarUrl: null,
    accountIdentifier: null,
    isDefault: false,
    isActive: true,
  }

  const provider = createCalendarProvider(tempConnection)

  return ResultAsync.fromPromise(provider.discoverCalendars(), dbError)
    .map((result) => {
      return result.isOk() && result.value.length > 0 ? result.value[0].url : null
    })
    .andThen((calendarUrl) =>
      upsertConnectionRpc(auth, {
        provider: 'caldav',
        displayName: data.displayName,
        credentials: { ...credentials, calendarUrl: calendarUrl ?? undefined },
        calendarUrl,
        accountIdentifier: `${data.username}@${new URL(data.serverUrl).hostname}`,
      })
    )
}

/**
 * Run the provider test and update last_verified_at on success.
 */
function runConnectionTest(auth: AuthContext, connection: CalendarConnection) {
  const provider = createCalendarProvider(connection, {
    onTokenRefresh: buildTokenRefreshCallback(auth.supabase),
  })

  return ResultAsync.fromPromise(provider.testConnection(), dbError).andThen((result) => {
    if (result.isErr()) {
      return err(`${messages.calendar.testConnectionFailed}: ${result.error}`)
    }

    return ResultAsync.fromPromise(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (auth.supabase as any)
        .from('calendar_connections')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', connection.id),
      dbError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).map(() => undefined)
  })
}

/**
 * Unset is_default for all tenant-level connections (user_id IS NULL).
 */
function unsetCurrentDefault(auth: AuthContext) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('calendar_connections')
      .update({ is_default: false })
      .eq('tenant_id', auth.tenantId)
      .is('user_id', null)
      .eq('is_default', true),
    dbError
  ).map(() => undefined)
}

/**
 * Mark a specific connection as default.
 */
function markAsDefault(auth: AuthContext, connectionId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('calendar_connections')
      .update({ is_default: true })
      .eq('id', connectionId),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    return ok(undefined)
  })
}
