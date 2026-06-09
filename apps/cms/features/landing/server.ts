import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { updateLandingCtaSchema, type UpdateLandingCtaInput } from './validation'
import { messages } from '@/lib/messages'
import { toLandingPage, type LandingPage } from './types'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions — Queries
// ---------------------------------------------------------------------------

export const getLandingPageFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<LandingPage | null> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- landing_pages not in generated types
    const { data, error } = await (supabase as any)
      .from('landing_pages')
      .select('*')
      .eq('slug', 'home')
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return toLandingPage(data)
  }
)

// ---------------------------------------------------------------------------
// Server Functions — Mutations
// ---------------------------------------------------------------------------

export const updateLandingCtaFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateLandingCtaInput) => updateLandingCtaSchema.parse(input))
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => updateCtaUrl(auth, input))

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function updateCtaUrl(auth: AuthContext, input: UpdateLandingCtaInput): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- landing_pages not in generated types
    (auth.supabase as any).from('landing_pages').update({ cta_url: input.cta_url }).eq('id', input.id),
    dbError
  ).andThen(fromSupabaseVoid())
}
