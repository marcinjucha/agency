import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { landingPageSchema } from './validation'
import type { LandingBlock, SeoMetadata } from '@agency/database'
import { messages } from '@/lib/messages'
import { toLandingPage, type LandingPage } from './types'
import { createStartClient } from '@/lib/supabase/server-start'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateLandingPageInputSchema = z.object({
  id: z.string().uuid(),
  data: landingPageSchema.partial(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions — Queries
// ---------------------------------------------------------------------------

export const getLandingPageFn = createServerFn().handler(
  async (): Promise<LandingPage | null> => {
    const supabase = createStartClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const updateLandingPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updateLandingPageInputSchema.parse(input))
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      updatePage(auth, input.id, input.data)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function updatePage(
  auth: AuthContext,
  id: string,
  data: {
    blocks?: LandingBlock[]
    seo_metadata?: SeoMetadata
    is_published?: boolean
  }
): ResultAsync<undefined, string> {
  const updatePayload = {
    ...(data.blocks !== undefined && { blocks: data.blocks }),
    ...(data.seo_metadata !== undefined && { seo_metadata: data.seo_metadata }),
    ...(data.is_published !== undefined && { is_published: data.is_published }),
  }

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- landing_pages not in generated types
    (auth.supabase as any).from('landing_pages').update(updatePayload).eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())
}
