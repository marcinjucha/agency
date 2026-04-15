'use server'

import { revalidatePath } from 'next/cache'
import { ok, err, ResultAsync } from 'neverthrow'
import type { Tables, TablesInsert } from '@agency/database'
import { requireAuthResult, zodParse, fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import type { AuthSuccess } from '@/lib/auth'
import {
  createSurveySchema,
  updateSurveySchema,
  generateSurveyLinkSchema,
  updateSurveyLinkSchema,
} from './validation'
import type { UpdateSurveyLinkFormData } from './validation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Server Actions (public API) ---

/**
 * Create a new survey.
 * Automatically assigns current user's tenant_id.
 */
export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  const result = await zodParse(createSurveySchema, formData)
    .asyncAndThen((parsed) => requireAuthResult('surveys').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => insertSurvey(auth, parsed))

  return result.match(
    (survey) => {
      revalidatePath(routes.admin.surveys)
      return { success: true, surveyId: (survey as Tables<'surveys'>).id }
    },
    (error) => ({ success: false, error }),
  )
}

/**
 * Update survey details.
 */
export async function updateSurvey(
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
): Promise<{ success: boolean; error?: string }> {
  const result = await zodParse(updateSurveySchema, data)
    .asyncAndThen(() => requireAuthResult('surveys'))
    .andThen((auth) => patchSurvey(auth, id, data))

  return result.match(
    () => {
      revalidatePath(routes.admin.surveys)
      revalidatePath(routes.admin.survey(id))
      return { success: true }
    },
    (error) => ({ success: false, error }),
  )
}

/**
 * Delete survey.
 */
export async function deleteSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  const result = await requireAuthResult('surveys')
    .andThen((auth) => deleteSurveyRow(auth, id))

  return result.match(
    () => {
      revalidatePath(routes.admin.surveys)
      revalidatePath(routes.admin.intake)
      return { success: true }
    },
    (error) => ({ success: false, error: error || messages.surveys.deleteFailed }),
  )
}

/**
 * Generate a new survey link.
 * Creates a unique token for survey access.
 * Accepts optional workflow_id to scope trigger dispatch to a specific workflow.
 */
export async function generateSurveyLink(
  surveyId: string,
  options: {
    notificationEmail: string
    expiresAt?: string
    maxSubmissions?: number | null
    isActive?: boolean
    calendarConnectionId?: string | null
    workflowId?: string | null
  }
): Promise<{ success: boolean; linkId?: string; token?: string; error?: string }> {
  const input = {
    surveyId,
    notificationEmail: options.notificationEmail,
    expiresAt: options.expiresAt,
    maxSubmissions: options.maxSubmissions,
    isActive: options.isActive ?? true,
    calendarConnectionId: options.calendarConnectionId ?? null,
    workflowId: options.workflowId ?? null,
  }

  const result = await zodParse(generateSurveyLinkSchema, input)
    .asyncAndThen((parsed) => requireAuthResult('surveys').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => verifySurveyAccess(auth, surveyId).map(() => ({ parsed, auth })))
    .andThen(({ parsed, auth }) =>
      parsed.workflowId
        ? verifyWorkflowAccess(auth, parsed.workflowId).map(() => ({ parsed, auth }))
        : ok({ parsed, auth })
    )
    .andThen(({ parsed, auth }) => insertSurveyLink(auth, surveyId, parsed))

  return result.match(
    (link) => {
      revalidatePath(routes.admin.survey(surveyId))
      return {
        success: true,
        linkId: (link as Tables<'survey_links'>).id,
        token: (link as Tables<'survey_links'>).token,
      }
    },
    (error) => ({ success: false, error }),
  )
}

/**
 * Delete a survey link.
 */
export async function deleteSurveyLink(
  linkId: string,
  surveyId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await requireAuthResult('surveys')
    .andThen((auth) => deleteLinkRow(auth, linkId))

  return result.match(
    () => {
      revalidatePath(routes.admin.surveys)
      revalidatePath(routes.admin.survey(surveyId))
      return { success: true }
    },
    (error) => ({ success: false, error: error || messages.surveys.deleteLinkFailed }),
  )
}

/**
 * Update an existing survey link.
 * Allows editing notification_email, expires_at, max_submissions, is_active, workflow_id.
 */
export async function updateSurveyLink(
  linkId: string,
  surveyId: string,
  data: UpdateSurveyLinkFormData
): Promise<{ success: boolean; error?: string }> {
  const result = await zodParse(updateSurveyLinkSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('surveys').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) =>
      parsed.workflowId
        ? verifyWorkflowAccess(auth, parsed.workflowId).map(() => ({ parsed, auth }))
        : ok({ parsed, auth })
    )
    .andThen(({ parsed, auth }) => patchSurveyLink(auth, linkId, parsed))

  return result.match(
    () => {
      revalidatePath(routes.admin.surveys)
      revalidatePath(routes.admin.survey(surveyId))
      return { success: true }
    },
    (error) => ({ success: false, error: error || messages.surveys.updateLinkFailed }),
  )
}

// --- DB helpers ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function insertSurvey(auth: AuthSuccess, parsed: { title: string; description?: string }) {
  const surveyData: TablesInsert<'surveys'> = {
    title: parsed.title,
    description: parsed.description || null,
    tenant_id: auth.tenantId,
    created_by: auth.userId,
    questions: [],
    status: 'draft',
  }

  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('surveys')
      .insert(surveyData)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<Tables<'surveys'>>())
}

function patchSurvey(
  auth: AuthSuccess,
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('surveys')
      .update(data)
      .eq('id', id),
    dbError,
  ).andThen(fromSupabaseVoid())
}

function deleteSurveyRow(auth: AuthSuccess, id: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('surveys')
      .delete()
      .eq('id', id),
    dbError,
  ).andThen(fromSupabaseVoid())
}

function verifySurveyAccess(auth: AuthSuccess, surveyId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('surveys')
      .select('id')
      .eq('id', surveyId)
      .maybeSingle(),
    dbError,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    return ok(res.data as { id: string })
  })
}

function verifyWorkflowAccess(auth: AuthSuccess, workflowId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    return ok(undefined)
  })
}

function insertSurveyLink(
  auth: AuthSuccess,
  surveyId: string,
  parsed: {
    notificationEmail: string
    expiresAt?: string
    maxSubmissions?: number | null
    isActive: boolean
    calendarConnectionId?: string | null
    workflowId?: string | null
  }
) {
  const token = crypto.randomUUID()

  const linkData: TablesInsert<'survey_links'> = {
    survey_id: surveyId,
    token,
    notification_email: parsed.notificationEmail,
    expires_at: parsed.expiresAt || null,
    max_submissions: parsed.maxSubmissions ?? null,
    submission_count: 0,
    is_active: parsed.isActive,
    calendar_connection_id: parsed.calendarConnectionId ?? null,
    workflow_id: parsed.workflowId ?? null,
  }

  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('survey_links')
      .insert(linkData)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<Tables<'survey_links'>>())
}

function patchSurveyLink(
  auth: AuthSuccess,
  linkId: string,
  parsed: {
    notificationEmail: string
    expiresAt?: string | null
    maxSubmissions?: number | null
    isActive: boolean
    calendarConnectionId?: string | null
    workflowId?: string | null
  }
) {
  const updatePayload: Record<string, unknown> = {
    notification_email: parsed.notificationEmail,
    expires_at: parsed.expiresAt ?? null,
    max_submissions: parsed.maxSubmissions ?? null,
    is_active: parsed.isActive,
  }

  if (parsed.calendarConnectionId !== undefined) {
    updatePayload.calendar_connection_id = parsed.calendarConnectionId ?? null
  }

  if (parsed.workflowId !== undefined) {
    updatePayload.workflow_id = parsed.workflowId ?? null
  }

  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('survey_links')
      .update(updatePayload)
      .eq('id', linkId),
    dbError,
  ).andThen(fromSupabaseVoid())
}

function deleteLinkRow(auth: AuthSuccess, linkId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('survey_links')
      .delete()
      .eq('id', linkId),
    dbError,
  ).andThen(fromSupabaseVoid())
}
