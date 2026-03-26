'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { blogPostSchema, type BlogPostFormData } from './validation'
import { toBlogPost, type BlogPost } from './types'
import { parseContent } from './utils'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Server Actions ---

export async function createBlogPost(
  data: BlogPostFormData & { html_body?: string; estimated_reading_time?: number }
): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  try {
    const parsed = blogPostSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    const insertPayload = {
      tenant_id: tenantId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      content: parseContent(parsed.data.content),
      html_body: data.html_body || null,
      cover_image_url: parsed.data.cover_image_url || null,
      category: parsed.data.category || null,
      author_name: parsed.data.author_name || null,
      seo_metadata: parsed.data.seo_metadata || null,
      is_published: parsed.data.is_published,
      estimated_reading_time: data.estimated_reading_time || null,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
    const { data: created, error } = await (supabase as any)
      .from('blog_posts')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.blog)
    return { success: true, data: toBlogPost(created) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function updateBlogPost(
  id: string,
  data: BlogPostFormData & { html_body?: string; estimated_reading_time?: number }
): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  try {
    const parsed = blogPostSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: messages.common.notLoggedIn }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    const shouldSetPublishedAt = parsed.data.is_published && !existing.published_at

    const updatePayload = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      content: parseContent(parsed.data.content),
      html_body: data.html_body || null,
      cover_image_url: parsed.data.cover_image_url || null,
      category: parsed.data.category || null,
      author_name: parsed.data.author_name || null,
      seo_metadata: parsed.data.seo_metadata || null,
      is_published: parsed.data.is_published,
      estimated_reading_time: data.estimated_reading_time || null,
      ...(shouldSetPublishedAt && { published_at: new Date().toISOString() }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
    const { data: updated, error } = await (supabase as any)
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.blog)
    revalidatePath(routes.admin.blogPost(id))
    return { success: true, data: toBlogPost(updated) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function deleteBlogPost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: messages.common.notLoggedIn }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
    const { error } = await (supabase as any)
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.blog)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
