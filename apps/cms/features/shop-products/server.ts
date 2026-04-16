import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createServerClient } from '@/lib/supabase/server-start'
import { requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth'
import { hasPermission } from '@/lib/permissions'
import { createShopProductSchema, updateShopProductSchema } from './validation'
import { toShopProduct, type ShopProduct, type ShopProductListItem, toShopProductListItem } from './types'
import { generateSlug } from './utils'
import { messages } from '@/lib/messages'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const shopProductIdSchema = z.object({ id: z.string().uuid() })

const togglePublishedSchema = z.object({
  id: z.string().uuid(),
  isPublished: z.boolean(),
})

const updateShopProductInputSchema = z.object({
  id: z.string().uuid(),
  data: updateShopProductSchema,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_products type resolves to never (Supabase JS v2.95.2 incompatibility)
const shopTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('shop_products')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

const LIST_FIELDS = 'id, title, slug, cover_image_url, listing_type, display_layout, price, currency, is_published, published_at, sort_order, category_id, short_description, created_at, updated_at' as const

// ---------------------------------------------------------------------------
// Server Functions — Queries (RLS handles tenant scoping)
// ---------------------------------------------------------------------------

export const getShopProductsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ShopProductListItem[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('shop_products')
      .select(LIST_FIELDS)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })

    if (error) throw new Error(messages.shop.loadProductsFailed)
    return (data ?? []).map(toShopProductListItem)
  }
)

export const getShopProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof shopProductIdSchema>) => shopProductIdSchema.parse(input))
  .handler(async ({ data: { id } }): Promise<ShopProduct | null> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase as any)
      .from('shop_products')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(messages.shop.loadProductsFailed)
    if (!row) return null
    return toShopProduct(row)
  })

// ---------------------------------------------------------------------------
// Server Functions — Mutations (requireAuthContextFull + permission check)
// ---------------------------------------------------------------------------

export const createShopProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createShopProductSchema>) => createShopProductSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: ShopProduct; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.products', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return insertProduct(auth, buildCreatePayload(data))
      })

      return result.match(
        (created) => ({ success: true, data: toShopProduct(created) }),
        (error) => ({ success: false, error })
      )
    }
  )

export const updateShopProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateShopProductInputSchema>) => updateShopProductInputSchema.parse(input))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; data?: ShopProduct; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.products', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return fetchPublishedAt(auth, input.id).map((existing) => ({ auth, existing }))
        })
        .andThen(({ auth, existing }) =>
          updateProduct(auth, input.id, buildUpdatePayload(input.data, existing))
        )

      return result.match(
        (updated) => ({ success: true, data: toShopProduct(updated) }),
        (error) => ({ success: false, error })
      )
    }
  )

export const deleteShopProductFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof shopProductIdSchema>) => shopProductIdSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.products', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return deleteProduct(auth, data.id)
      })

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      )
    }
  )

export const toggleShopProductPublishedFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof togglePublishedSchema>) => togglePublishedSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.products', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return fetchPublishedAt(auth, data.id).map((existing) => ({ auth, existing }))
        })
        .andThen(({ auth, existing }) => {
          const published_at = data.isPublished
            ? (existing.published_at || new Date().toISOString())
            : null
          return toggleProduct(auth, data.id, data.isPublished, published_at)
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

const insertProduct = (auth: AuthContextFull, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    shopTable(auth.supabase)
      .insert({ ...payload, tenant_id: auth.tenantId })
      .select()
      .single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const updateProduct = (auth: AuthContextFull, id: string, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    shopTable(auth.supabase).update(payload).eq('id', id).select().single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const deleteProduct = (auth: AuthContextFull, id: string) =>
  ResultAsync.fromPromise(
    shopTable(auth.supabase).delete().eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())

const fetchPublishedAt = (auth: AuthContextFull, id: string) =>
  ResultAsync.fromPromise(
    shopTable(auth.supabase).select('published_at').eq('id', id).single(),
    dbError
  ).andThen(fromSupabase<{ published_at: string | null }>())

const toggleProduct = (
  auth: AuthContextFull,
  id: string,
  isPublished: boolean,
  published_at: string | null
) =>
  ResultAsync.fromPromise(
    shopTable(auth.supabase).update({ is_published: isPublished, published_at }).eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

type CreatePayload = z.infer<typeof createShopProductSchema>
type UpdatePayload = z.infer<typeof updateShopProductSchema>

function buildCreatePayload(data: CreatePayload): Record<string, unknown> {
  const slug = data.slug || generateSlug(data.title)
  return {
    title: data.title,
    slug,
    listing_type: data.listing_type,
    display_layout: data.display_layout ?? 'gallery',
    short_description: data.short_description || null,
    description: data.description || null,
    html_body: (data as Record<string, unknown>).html_body || null,
    cover_image_url: data.cover_image_url || null,
    images: data.images || null,
    price: data.price ?? null,
    currency: data.currency ?? 'PLN',
    external_url: data.external_url || null,
    digital_file_url: data.digital_file_url || null,
    digital_file_name: data.digital_file_name || null,
    digital_file_size: data.digital_file_size ?? null,
    category_id: data.category_id || null,
    tags: data.tags || null,
    sort_order: data.sort_order ?? 0,
    seo_metadata: data.seo_metadata || null,
    is_featured: data.is_featured ?? false,
    is_published: data.is_published,
    published_at: data.is_published
      ? (data.published_at || new Date().toISOString())
      : null,
  }
}

function buildUpdatePayload(
  data: UpdatePayload,
  existing: { published_at: string | null }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (data.title !== undefined) payload.title = data.title
  if (data.slug !== undefined) payload.slug = data.slug
  if (data.listing_type !== undefined) payload.listing_type = data.listing_type
  if (data.display_layout !== undefined) payload.display_layout = data.display_layout
  if (data.short_description !== undefined) payload.short_description = data.short_description || null
  if (data.description !== undefined) payload.description = data.description || null
  if ((data as Record<string, unknown>).html_body !== undefined) payload.html_body = (data as Record<string, unknown>).html_body || null
  if (data.cover_image_url !== undefined) payload.cover_image_url = data.cover_image_url || null
  if (data.images !== undefined) payload.images = data.images || null
  if (data.price !== undefined) payload.price = data.price ?? null
  if (data.currency !== undefined) payload.currency = data.currency
  if (data.external_url !== undefined) payload.external_url = data.external_url || null
  if (data.digital_file_url !== undefined) payload.digital_file_url = data.digital_file_url || null
  if (data.digital_file_name !== undefined) payload.digital_file_name = data.digital_file_name || null
  if (data.digital_file_size !== undefined) payload.digital_file_size = data.digital_file_size ?? null
  if (data.category_id !== undefined) payload.category_id = data.category_id || null
  if (data.tags !== undefined) payload.tags = data.tags || null
  if (data.sort_order !== undefined) payload.sort_order = data.sort_order
  if (data.seo_metadata !== undefined) payload.seo_metadata = data.seo_metadata || null
  if (data.is_featured !== undefined) payload.is_featured = data.is_featured
  if (data.is_published !== undefined) {
    payload.is_published = data.is_published
    payload.published_at = resolvePublishedAt(data, existing)
  }

  return payload
}

/** 4-way branch: draft → null, explicit date → use it, first publish → now, else keep existing */
function resolvePublishedAt(
  data: UpdatePayload,
  existing: { published_at: string | null }
): string | null {
  if (!data.is_published) return null
  if (data.published_at) return data.published_at
  if (!existing.published_at) return new Date().toISOString()
  return existing.published_at
}
