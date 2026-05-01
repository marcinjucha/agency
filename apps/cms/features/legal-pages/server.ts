import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { legalPageSchema } from './validation'
import { parseContent, generateHtmlFromContent } from '../editor/utils'
import { messages } from '@/lib/messages'
import { getAuth, requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth.server'
import { hasPermission } from '@/lib/permissions'
import { z } from 'zod'
import type { TiptapContent } from '../editor/types'
import type { LegalPage, LegalPageListItem } from './types'
import { toLegalPage, toLegalPageListItem } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pagesTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('pages')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

/**
 * Map raw DB error to friendly slug-conflict message when the unique index
 * on (tenant_id, slug) fires. Otherwise return the original message.
 */
const mapSlugConflict = (raw: string): string =>
  /23505|duplicate key|unique/i.test(raw) && /slug/i.test(raw)
    ? messages.legalPages.slugConflict
    : raw

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const updateLegalPageInputSchema = z.object({
  id: z.string().uuid(),
  data: legalPageSchema,
})

const deleteLegalPageInputSchema = z.object({
  id: z.string().uuid(),
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

/**
 * Fetch a single legal page by id for the authenticated tenant.
 * Mirrors getLegalPage from queries.ts but uses server client.
 */
export const getLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<LegalPage | null> => {
    const auth = await getAuth()
    if (!auth) throw new Error('Legal page not found')

    const { data: row, error } = await pagesTable(auth.supabase)
      .select('*')
      .eq('id', data.id)
      .eq('page_type', 'legal')
      .maybeSingle()

    if (error) throw error
    if (!row) throw new Error('Legal page not found')
    return toLegalPage(row)
  })

export const createLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof legalPageSchema>) => legalPageSchema.parse(input))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; id?: string; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('content.legal_pages', auth.permissions)) {
          return err(messages.common.noPermission)
        }

        const content = parseContent(input.content) as TiptapContent
        const htmlBody = generateHtmlFromContent(content)

        const payload = {
          tenant_id: auth.tenantId,
          slug: input.slug,
          title: input.title,
          page_type: 'legal',
          blocks: content,
          html_body: htmlBody,
          is_published: input.is_published,
        }

        return ResultAsync.fromPromise(
          pagesTable(auth.supabase).insert(payload).select('id').single(),
          dbError,
        )
          .andThen(fromSupabase<{ id: string }>())
          .mapErr(mapSlugConflict)
      })

      return result.match(
        (row) => ({ success: true, id: row.id }),
        (error) => ({ success: false, error }),
      )
    },
  )

export const updateLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateLegalPageInputSchema>) =>
    updateLegalPageInputSchema.parse(input),
  )
  .handler(
    async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('content.legal_pages', auth.permissions)) {
          return err(messages.common.noPermission)
        }

        const content = parseContent(input.data.content) as TiptapContent
        const htmlBody = generateHtmlFromContent(content)

        const payload = {
          slug: input.data.slug,
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
        )
          .andThen(fromSupabaseVoid())
          .mapErr(mapSlugConflict)
      })

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error }),
      )
    },
  )

export const deleteLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof deleteLegalPageInputSchema>) =>
    deleteLegalPageInputSchema.parse(input),
  )
  .handler(
    async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('content.legal_pages', auth.permissions)) {
          return err(messages.common.noPermission)
        }

        return ResultAsync.fromPromise(
          pagesTable(auth.supabase)
            .delete()
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
