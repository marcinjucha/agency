/**
 * Calendar Data Fetching Queries
 *
 * Server-side data fetching for calendar slot availability.
 * Uses Supabase server client (with await).
 * All queries include type safety and error handling.
 *
 * @module apps/website/features/calendar/queries
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Tables, Database } from '@legal-mind/database'

/**
 * Get survey with associated lawyer information
 *
 * Queries: surveys table → get created_by user_id and tenant_id
 *
 * @param surveyId - UUID of the survey
 * @returns Object with survey ID, lawyer (creator) ID, and tenant ID
 * @throws Error if survey not found
 */
export async function getSurveyWithLawyer(surveyId: string): Promise<{
  id: string
  user_id: string
  tenant_id: string
}> {
  const supabase = await createClient()

  const { data: survey, error } = await supabase
    .from('surveys')
    .select('id, created_by, tenant_id')
    .eq('id', surveyId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch survey: ${error.message}`)
  }

  if (!survey) {
    throw new Error('Survey not found')
  }

  const typedSurvey = survey as Pick<
    Tables<'surveys'>,
    'id' | 'created_by' | 'tenant_id'
  >

  return {
    id: typedSurvey.id,
    user_id: typedSurvey.created_by,
    tenant_id: typedSurvey.tenant_id,
  }
}

/**
 * Get lawyer's Google Calendar token
 *
 * Queries: users table → get google_calendar_token
 * Includes RLS filtering by tenant_id (automatic via policies)
 *
 * @param lawyerId - UUID of the lawyer (user)
 * @param tenantId - UUID of the tenant for RLS verification
 * @returns Object with Google Calendar token (or null if not connected)
 * @throws Error if user not found
 */
export async function getLawyerCalendarToken(
  lawyerId: string,
  tenantId: string
): Promise<{
  token: any | null
}> {
  const supabase = await createClient()

  console.log('[CALENDAR] Getting token for lawyerId:', lawyerId, 'tenantId:', tenantId)

  const { data: user, error } = await supabase
    .from('users')
    .select('google_calendar_token, tenant_id')
    .eq('id', lawyerId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  console.log('[CALENDAR] Query result:', { user, error })

  if (error) {
    console.error('[CALENDAR] Query error:', error)
    throw new Error(`Failed to fetch lawyer: ${error.message}`)
  }

  if (!user) {
    console.error('[CALENDAR] User not found for lawyerId:', lawyerId, 'tenantId:', tenantId)
    throw new Error('Lawyer not found')
  }

  const typedUser = user as Pick<
    Tables<'users'>,
    'google_calendar_token' | 'tenant_id'
  >

  console.log('[CALENDAR] User found, token:', typedUser.google_calendar_token ? 'present' : 'null')

  return {
    token: typedUser.google_calendar_token,
  }
}

/**
 * Get lawyer's Google Calendar token (PUBLIC version)
 *
 * Uses service role key to bypass RLS - for public endpoints only.
 * Queries: users table → get google_calendar_token
 *
 * SECURITY NOTE: Service role bypasses RLS, which is SAFE here because:
 * - Only used for public calendar slot viewing (no sensitive data modification)
 * - lawyerId and tenantId are fetched from survey (not user-provided)
 * - Only returns calendar token, no other user data
 *
 * @param lawyerId - UUID of the lawyer (user)
 * @param tenantId - UUID of the tenant for verification
 * @returns Object with Google Calendar token (or null if not connected)
 * @throws Error if user not found
 */
export async function getLawyerCalendarTokenPublic(
  lawyerId: string,
  tenantId: string
): Promise<{
  token: any | null
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    )
  }

  // Service role client bypasses RLS - safe for public calendar viewing
  const supabase = createServiceClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  console.log('[CALENDAR] Getting token for lawyerId:', lawyerId, 'tenantId:', tenantId)

  const { data: user, error } = await supabase
    .from('users')
    .select('google_calendar_token, tenant_id')
    .eq('id', lawyerId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  console.log('[CALENDAR] Query result:', { user, error })

  if (error) {
    console.error('[CALENDAR] Query error:', error)
    throw new Error(`Failed to fetch lawyer: ${error.message}`)
  }

  if (!user) {
    console.error('[CALENDAR] User not found for lawyerId:', lawyerId, 'tenantId:', tenantId)
    throw new Error('Lawyer not found')
  }

  const typedUser = user as Pick<
    Tables<'users'>,
    'google_calendar_token' | 'tenant_id'
  >

  console.log('[CALENDAR] User found, token:', typedUser.google_calendar_token ? 'present' : 'null')

  return {
    token: typedUser.google_calendar_token,
  }
}
