'use server'

import { revalidatePath } from 'next/cache'
import { err, ResultAsync } from 'neverthrow'
import { authResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { type AuthSuccess } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { blogPostSchema, type BlogPostFormData } from './validation'
import { toBlogPost, type BlogPost } from './types'
import { parseContent } from './utils'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Types ---

type BlogPostInput = BlogPostFormData & { html_body?: string; estimated_reading_time?: number }

// --- Server Actions ---

export async function createBlogPost(
  data: BlogPostInput
): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  const result = await zodParse(blogPostSchema, data)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('content.blog', auth.permissions)) return err(messages.common.noPermission)
      return insertPost(auth, buildCreatePayload(parsed, data))
    })

  return result.match(
    (created) => {
      revalidatePath(routes.admin.blog)
      return { success: true, data: toBlogPost(created) }
    },
    (error) => ({ success: false, error }),
  )
}

export async function updateBlogPost(
  id: string,
  data: BlogPostInput
): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  const result = await zodParse(blogPostSchema, data)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('content.blog', auth.permissions)) return err(messages.common.noPermission)
      return fetchPublishedAt(auth, id).map((existing) => ({ parsed, auth, existing }))
    })
    .andThen(({ parsed, auth, existing }) =>
      updatePost(auth, id, buildUpdatePayload(parsed, data, existing))
    )

  return result.match(
    (updated) => {
      revalidatePath(routes.admin.blog)
      revalidatePath(routes.admin.blogPost(id))
      return { success: true, data: toBlogPost(updated) }
    },
    (error) => ({ success: false, error }),
  )
}

export async function deleteBlogPost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const result = await authResult()
    .andThen((auth) => {
      if (!hasPermission('content.blog', auth.permissions)) return err(messages.common.noPermission)
      return deletePost(auth, id)
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.blog)
      return { success: true }
    },
    (error) => ({ success: false, error }),
  )
}

// --- DB helpers (blog-local) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
const blogTable = (supabase: AuthSuccess['supabase']) => (supabase as any).from('blog_posts')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

const insertPost = (auth: AuthSuccess, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).insert({ ...payload, tenant_id: auth.tenantId }).select().single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const updatePost = (auth: AuthSuccess, id: string, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).update(payload).eq('id', id).select().single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const deletePost = (auth: AuthSuccess, id: string) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).delete().eq('id', id).then(
      (res: { error: { message: string } | null }) => {
        if (res.error) throw new Error(res.error.message)
      }
    ),
    dbError
  )

const fetchPublishedAt = (auth: AuthSuccess, id: string) =>
  ResultAsync.fromPromise(
    blogTable(auth.supabase).select('published_at').eq('id', id).single(),
    dbError
  ).andThen(fromSupabase<{ published_at: string | null }>())

// --- Business logic ---

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
    published_at: parsed.is_published ? (parsed.published_at || new Date().toISOString()) : null,
  }
}

function buildUpdatePayload(parsed: BlogPostFormData, data: BlogPostInput, existing: { published_at: string | null }) {
  return {
    ...buildCreatePayload(parsed, data),
    published_at: resolvePublishedAt(parsed, existing),
  }
}

/** 4-way branch: draft → null, explicit date → use it, first publish → now, else keep existing */
function resolvePublishedAt(parsed: BlogPostFormData, existing: { published_at: string | null }): string | null {
  if (!parsed.is_published) return null
  if (parsed.published_at) return parsed.published_at
  if (!existing.published_at) return new Date().toISOString()
  return existing.published_at
}
