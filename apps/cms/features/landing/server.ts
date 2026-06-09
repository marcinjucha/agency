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
    const { data, error } = await supabase
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
    // Supabase JS v2.95.2 (PostgrestVersion 13) types the `.update()` parameter as `never`,
    // so the typed client rejects any payload — the same incompatibility that forces the
    // `(supabase as any)` + `as unknown as TablesInsert<...>` casts in surveys/server.ts.
    // This is NOT the old "landing_pages missing from generated types" cast (now resolved):
    // the READ above uses the fully-typed client. Only this write still needs the escape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS update() param resolves to never
    (auth.supabase as any).from('landing_pages').update({ cta_url: input.cta_url }).eq('id', input.id),
    dbError
  ).andThen(fromSupabaseVoid())
}
