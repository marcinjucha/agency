import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import type { Tables, TablesInsert } from '@agency/database'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import {
  createSurveySchema,
  updateSurveySchema,
  generateSurveyLinkSchema,
  updateSurveyLinkSchema,
} from '@/features/surveys/validation'
import type { UpdateSurveyLinkFormData } from '@/features/surveys/validation'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'

// ---------------------------------------------------------------------------
// Auth helper — TanStack Start equivalent of requireAuthResult
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
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Create a new survey.
 * TanStack Start port of features/surveys/actions.ts#createSurvey.
 */
export const createSurveyFn = createServerFn()
  .inputValidator((input: { title: string; description?: string }) =>
    createSurveySchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; surveyId?: string; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => insertSurvey(auth, data))

    return result.match(
      (survey) => ({ success: true, surveyId: (survey as Tables<'surveys'>).id }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Update survey details.
 * TanStack Start port of features/surveys/actions.ts#updateSurvey.
 */
export const updateSurveyFn = createServerFn()
  .inputValidator(
    (input: {
      id: string
      data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
    }) => {
      updateSurveySchema.parse(input.data)
      return input
    }
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      patchSurvey(auth, data.id, data.data)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Delete a survey.
 * TanStack Start port of features/surveys/actions.ts#deleteSurvey.
 */
export const deleteSurveyFn = createServerFn()
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => deleteSurveyRow(auth, data.id))

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error: error || messages.surveys.deleteFailed })
    )
  })

/**
 * Generate a new survey link.
 * TanStack Start port of features/surveys/actions.ts#generateSurveyLink.
 */
export const generateSurveyLinkFn = createServerFn()
  .inputValidator(
    (input: {
      surveyId: string
      notificationEmail: string
      expiresAt?: string
      maxSubmissions?: number | null
      isActive?: boolean
      calendarConnectionId?: string | null
      workflowId?: string | null
    }) => {
      const normalized = {
        surveyId: input.surveyId,
        notificationEmail: input.notificationEmail,
        expiresAt: input.expiresAt,
        maxSubmissions: input.maxSubmissions,
        isActive: input.isActive ?? true,
        calendarConnectionId: input.calendarConnectionId ?? null,
        workflowId: input.workflowId ?? null,
      }
      return generateSurveyLinkSchema.parse(normalized)
    }
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; linkId?: string; token?: string; error?: string }> => {
      const result = await requireAuthContext()
        .andThen((auth) => verifySurveyAccess(auth, data.surveyId).map(() => ({ auth, data })))
        .andThen(({ auth, data: parsed }) =>
          parsed.workflowId
            ? verifyWorkflowAccess(auth, parsed.workflowId).map(() => ({ auth, parsed }))
            : ok({ auth, parsed })
        )
        .andThen(({ auth, parsed }) => insertSurveyLink(auth, parsed.surveyId, parsed))

      return result.match(
        (link) => ({
          success: true,
          linkId: (link as Tables<'survey_links'>).id,
          token: (link as Tables<'survey_links'>).token,
        }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Delete a survey link.
 * TanStack Start port of features/surveys/actions.ts#deleteSurveyLink.
 */
export const deleteSurveyLinkFn = createServerFn()
  .inputValidator((input: { linkId: string; surveyId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => deleteLinkRow(auth, data.linkId))

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error: error || messages.surveys.deleteLinkFailed })
    )
  })

/**
 * Update an existing survey link.
 * TanStack Start port of features/surveys/actions.ts#updateSurveyLink.
 */
export const updateSurveyLinkFn = createServerFn()
  .inputValidator((input: { linkId: string; surveyId: string; data: UpdateSurveyLinkFormData }) => {
    updateSurveyLinkSchema.parse(input.data)
    return input
  })
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const parsed = updateSurveyLinkSchema.parse(data.data)

    const result = await requireAuthContext()
      .andThen((auth) =>
        parsed.workflowId
          ? verifyWorkflowAccess(auth, parsed.workflowId).map(() => ({ auth, parsed }))
          : ok({ auth, parsed })
      )
      .andThen(({ auth, parsed }) => patchSurveyLink(auth, data.linkId, parsed))

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error: error || messages.surveys.updateLinkFailed })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers — same logic as features/surveys/actions.ts, adapted for AuthContext
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

function insertSurvey(auth: AuthContext, parsed: { title: string; description?: string }) {
  const surveyData: TablesInsert<'surveys'> = {
    title: parsed.title,
    description: parsed.description || null,
    tenant_id: auth.tenantId,
    created_by: auth.userId,
    questions: [],
    status: 'draft',
  }

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('surveys').insert(surveyData).select().single(),
    dbError
  ).andThen(fromSupabase<Tables<'surveys'>>())
}

function patchSurvey(
  auth: AuthContext,
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('surveys').update(data).eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function deleteSurveyRow(auth: AuthContext, id: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('surveys').delete().eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}

function verifySurveyAccess(auth: AuthContext, surveyId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('surveys').select('id').eq('id', surveyId).maybeSingle(),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    return ok(res.data as { id: string })
  })
}

function verifyWorkflowAccess(auth: AuthContext, workflowId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  ).andThen((res: any) => {
    if (res.error) return err(res.error.message as string)
    if (!res.data) return err(messages.surveys.notFound)
    return ok(undefined)
  })
}

function insertSurveyLink(
  auth: AuthContext,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('survey_links').insert(linkData).select().single(),
    dbError
  ).andThen(fromSupabase<Tables<'survey_links'>>())
}

function patchSurveyLink(
  auth: AuthContext,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('survey_links').update(updatePayload).eq('id', linkId),
    dbError
  ).andThen(fromSupabaseVoid())
}

function deleteLinkRow(auth: AuthContext, linkId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('survey_links').delete().eq('id', linkId),
    dbError
  ).andThen(fromSupabaseVoid())
}
