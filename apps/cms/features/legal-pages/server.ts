import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { legalPageSchema } from './validation'
import { parseContent, generateHtmlFromContent } from '../editor/utils'
import { messages } from '@/lib/messages'
import { getAuth, requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth'
import { hasPermission } from '@/lib/permissions'
import { z } from 'zod'
import type { TiptapContent } from '../editor/types'
import type { LegalPageListItem } from './types'
import { toLegalPageListItem } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pagesTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('pages')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const updateLegalPageInputSchema = z.object({
  id: z.string().uuid(),
  data: legalPageSchema,
})

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

/**
 * Fetch all legal pages for the authenticated tenant.
 * Mirrors getLegalPages from queries.ts but uses server client.
 */
export const getLegalPagesFn = createServerFn({ method: 'POST' }).handler(async (): Promise<LegalPageListItem[]> => {
  const auth = await getAuth()
  if (!auth) return []

  const { data, error } = await pagesTable(auth.supabase)
    .select('id, slug, title, is_published, updated_at')
    .eq('page_type', 'legal')
    .order('title', { ascending: true })

  if (error) throw error
  return (data || []).map(toLegalPageListItem)
})

export const updateLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateLegalPageInputSchema>) => updateLegalPageInputSchema.parse(input))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('content.legal_pages', auth.permissions)) {
            return err(messages.common.noPermission)
          }

          const content = parseContent(input.data.content) as TiptapContent
          const htmlBody = generateHtmlFromContent(content)

          const payload = {
            title: input.data.title,
            blocks: content,
            html_body: htmlBody,
            is_published: input.data.is_published,
          }

          return ResultAsync.fromPromise(
            pagesTable(auth.supabase)
              .update(payload)
              .eq('id', input.id)
              .eq('page_type', 'legal'),
            dbError,
          ).andThen(fromSupabaseVoid())
        })

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error }),
      )
    },
  )
