import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { blogPostSchema, type BlogPostFormData } from './validation'
import { toBlogPost, toBlogPostListItem, type BlogPost, type BlogPostListItem } from './types'
import { parseContent } from './utils'
import { messages } from '@/lib/messages'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth.server'
import { hasPermission } from '@/lib/permissions'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const blogPostIdSchema = z.object({ id: z.string().uuid() })

const blogPostInputSchema = blogPostSchema.extend({
  html_body: z.string().optional(),
  estimated_reading_time: z.number().int().positive().optional(),
})

const updateBlogPostInputSchema = z.object({
  id: z.string().uuid(),
  data: blogPostInputSchema,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
const blogTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('blog_posts')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions — Queries (no requireAuthContextFull — RLS handles tenant scoping)
// ---------------------------------------------------------------------------

export const getBlogPostsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<BlogPostListItem[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blog_posts')
      .select(
        'id, slug, title, excerpt, cover_image_url, category, is_published, published_at, estimated_reading_time, author_name, created_at'
      )
      .order('updated_at', { ascending: false })

    if (error) throw new Error(messages.blog.loadFailed)
    return (data ?? []).map(toBlogPostListItem)
  }
)

const blogPostByIdSchema = z.object({ id: z.string().uuid() })

export const getBlogPostFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof blogPostByIdSchema>) => blogPostByIdSchema.parse(input))
  .handler(async ({ data: { id } }): Promise<BlogPost | null> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase as any)
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(messages.blog.loadFailed)
    if (!row) throw new Error(messages.blog.loadFailed)
    return toBlogPost(row)
  })

export const getCategoriesFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('blog_posts').select('category')

    if (error) throw new Error(messages.blog.loadFailed)

    const rows = (data ?? []) as { category: string | null }[]
    const categories = [
      ...new Set(
        rows
          .map((d) => d.category)
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      ),
    ]
    return categories.sort((a, b) => a.localeCompare(b, 'pl'))
  }
)

// ---------------------------------------------------------------------------
// Server Functions — Mutations (requireAuthContextFull + permission check)
// ---------------------------------------------------------------------------

export const createBlogPostFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof blogPostInputSchema>) => blogPostInputSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: BlogPost; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('content.blog', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return insertPost(auth, buildCreatePayload(data, data))
      })

      return result.match(
        (created) => ({ success: true, data: toBlogPost(created) }),
        (error) => ({ success: false, error })
      )
    }
  )

export const updateBlogPostFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateBlogPostInputSchema>) => updateBlogPostInputSchema.parse(input))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; data?: BlogPost; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('content.blog', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return fetchPublishedAt(auth, input.id).map((existing) => ({ auth, existing }))
        })
        .andThen(({ auth, existing }) =>
          updatePost(auth, input.id, buildUpdatePayload(input.data, input.data, existing))
        )

      return result.match(
        (updated) => ({ success: true, data: toBlogPost(updated) }),
        (error) => ({ success: false, error })
      )
    }
  )

export const deleteBlogPostFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof blogPostIdSchema>) => blogPostIdSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('content.blog', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return deletePost(auth, data.id)
      })

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

const insertPost = (auth: AuthContextFull, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase)
      .insert({ ...payload, tenant_id: auth.tenantId })
      .select()
      .single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const updatePost = (auth: AuthContextFull, id: string, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).update(payload).eq('id', id).select().single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const deletePost = (auth: AuthContextFull, id: string) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase)
      .delete()
      .eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())

const fetchPublishedAt = (auth: AuthContextFull, id: string) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).select('published_at').eq('id', id).single(),
    dbError
  ).andThen(fromSupabase<{ published_at: string | null }>())

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

type BlogPostInput = BlogPostFormData & { html_body?: string; estimated_reading_time?: number }

function buildCreatePayload(parsed: BlogPostFormData, data: BlogPostInput) {
  return {
    title: parsed.title,
    slug: parsed.slug,
    excerpt: parsed.excerpt || null,
    content: parseContent(parsed.content),
    html_body: data.html_body || null,
    cover_image_url: parsed.cover_image_url || null,
    category: parsed.category || null,
    author_name: parsed.author_name || null,
    seo_metadata: parsed.seo_metadata || null,
    is_published: parsed.is_published,
    estimated_reading_time: data.estimated_reading_time || null,
    published_at: parsed.is_published
      ? parsed.published_at || new Date().toISOString()
      : null,
  }
}

function buildUpdatePayload(
  parsed: BlogPostFormData,
  data: BlogPostInput,
  existing: { published_at: string | null }
) {
  return {
    ...buildCreatePayload(parsed, data),
    published_at: resolvePublishedAt(parsed, existing),
  }
}

/** 4-way branch: draft → null, explicit date → use it, first publish → now, else keep existing */
function resolvePublishedAt(
  parsed: BlogPostFormData,
  existing: { published_at: string | null }
): string | null {
  if (!parsed.is_published) return null
  if (parsed.published_at) return parsed.published_at
  if (!existing.published_at) return new Date().toISOString()
  return existing.published_at
}
