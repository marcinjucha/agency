/**
 * Intake Hub Queries (Browser Client)
 *
 * Pipeline-specific queries that compose from responses and appointments tables.
 * Uses browser client (createClient) for TanStack Query in client components.
 *
 * Different from responses/queries.ts which returns minimal list items —
 * these queries include ai_qualification + answers for name extraction + survey context.
 *
 * @module apps/cms/features/intake/queries
 */

import { createClient } from '@/lib/supabase/client'
import type { PipelineResponse, IntakeStats, ClientInfo } from './types'
import type { AIQualification } from '../responses/types'
import type { Question } from '@agency/validators'

/**
 * Extract client contact info from survey answers using semantic_role.
 * Uses semantic_role to find name/email/company/phone fields.
 * Falls back to positional guess (first answer = name) for old surveys without semantic_role.
 */
function extractClientInfo(
  answers: Record<string, unknown>,
  questions: unknown[],
  fallbackIndex: number
): ClientInfo {
  const typedQuestions = questions as Question[]

  const findByRole = (role: string): string | null => {
    const q = typedQuestions.find((q) => q.semantic_role === role)
    if (!q) return null
    const answer = answers[q.id]
    return typeof answer === 'string' && answer.trim() ? answer.trim() : null
  }

  const name = findByRole('client_name')
  const email = findByRole('client_email')
  const companyName = findByRole('company_name')
  const phone = findByRole('phone')

  // Display name priority: company → name → email → first answer → fallback
  const displayName = companyName || name || email || (() => {
    const values = Object.values(answers)
    if (values.length > 0 && typeof values[0] === 'string' && values[0].trim()) {
      return values[0].trim()
    }
    return `Odpowiedź #${fallbackIndex}`
  })()

  return {
    name: displayName,
    email,
    companyName,
    phone,
  }
}

/**
 * Fetch all responses for pipeline view.
 * Includes ai_qualification + answers for name extraction + survey title.
 * Different from getResponses() which returns minimal list items.
 *
 * @returns Array of pipeline responses with AI data and client names
 * @throws Error if query fails (TanStack Query catches)
 */
export async function getPipelineResponses(): Promise<PipelineResponse[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      id, status, answers, ai_qualification, created_at, internal_notes, status_changed_at, survey_link_id,
      survey_links(survey_id, surveys(title, questions)),
      appointments(id, start_time, end_time, status)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any, index: number) => {
    const ai = row.ai_qualification as AIQualification | null
    const answers = (row.answers ?? {}) as Record<string, unknown>

    const clientInfo = extractClientInfo(answers, row.survey_links?.surveys?.questions ?? [], index + 1)

    return {
      id: row.id,
      status: row.status ?? 'new',
      clientName: clientInfo.name,
      clientEmail: clientInfo.email,
      companyName: clientInfo.companyName,
      phone: clientInfo.phone,
      aiScore: ai?.overall_score ?? null,
      aiRecommendation: ai?.recommendation ?? null,
      createdAt: row.created_at,
      hasAppointment: !!(row.appointments && row.appointments.length > 0),
      appointment: row.appointments?.[0]
        ? {
            startTime: row.appointments[0].start_time,
            endTime: row.appointments[0].end_time,
            status: row.appointments[0].status,
          }
        : null,
      internalNotes: row.internal_notes,
      statusChangedAt: row.status_changed_at,
      answers: answers as PipelineResponse['answers'],
      surveyTitle: row.survey_links?.surveys?.title ?? 'Nieznana ankieta',
      surveyQuestions: (row.survey_links?.surveys?.questions ?? []) as unknown[],
      surveyLinkId: row.survey_link_id,
    }
  })
}

/**
 * Fetch intake stats: counts for new responses, contacted, and today/tomorrow appointments.
 * Used by StatsBar component at the top of Intake Hub.
 *
 * @returns Intake statistics counts
 * @throws Error if any query fails (TanStack Query catches)
 */
export async function getIntakeStats(): Promise<IntakeStats> {
  const supabase = createClient()

  // Appointments are filtered by user_id (same scope as getAppointments)
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const todayApptQuery = supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
  if (userId) todayApptQuery.eq('user_id', userId)

  const tomorrowApptQuery = supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', tomorrow.toISOString())
    .lt('start_time', dayAfter.toISOString())
  if (userId) tomorrowApptQuery.eq('user_id', userId)

  const [newRes, contactedRes, todayAppt, tomorrowAppt] = await Promise.all([
    supabase.from('responses').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'contacted'),
    todayApptQuery,
    tomorrowApptQuery,
  ])

  return {
    newResponses: newRes.count ?? 0,
    waitingForContact: contactedRes.count ?? 0,
    appointmentsToday: todayAppt.count ?? 0,
    appointmentsTomorrow: tomorrowAppt.count ?? 0,
  }
}
