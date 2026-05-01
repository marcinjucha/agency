import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth.server'
import { hasPermission } from '@/lib/permissions'
import { createShopCategorySchema, updateShopCategorySchema } from './validation'
import type { ShopCategory } from './types'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const shopCategoryIdSchema = z.object({ id: z.string().uuid() })

const updateShopCategoryInputSchema = z.object({
  id: z.string().uuid(),
  data: updateShopCategorySchema,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_categories type resolves to never (Supabase JS v2.95.2 incompatibility)
const catTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('shop_categories')

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions — Queries (RLS handles tenant scoping)
// ---------------------------------------------------------------------------

export const getShopCategoriesFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ShopCategory[]> => {
    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('shop_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new Error(messages.shop.loadCategoriesFailed)
    return data ?? []
  }
)

// ---------------------------------------------------------------------------
// Server Functions — Mutations (requireAuthContextFull + permission check)
// ---------------------------------------------------------------------------

export const createShopCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createShopCategorySchema>) => createShopCategorySchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: ShopCategory; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.products', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return insertCategory(auth, buildCreatePayload(data))
      })

      return result.match(
        (created) => ({ success: true as const, data: created as ShopCategory }),
        (error) => ({ success: false as const, error })
      )
    }
  )

export const updateShopCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateShopCategoryInputSchema>) => updateShopCategoryInputSchema.parse(input))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; data?: ShopCategory; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.products', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return updateCategory(auth, input.id, buildUpdatePayload(input.data))
        })

      return result.match(
        (updated) => ({ success: true, data: updated as ShopCategory }),
        (error) => ({ success: false, error })
      )
    }
  )

export const deleteShopCategoryFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof shopCategoryIdSchema>) => shopCategoryIdSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.products', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return deleteCategory(auth, data.id)
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

const insertCategory = (auth: AuthContextFull, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    catTable(auth.supabase)
      .insert({ ...payload, tenant_id: auth.tenantId })
      .select()
      .single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const updateCategory = (auth: AuthContextFull, id: string, payload: Record<string, unknown>) =>
  ResultAsync.fromPromise(
    catTable(auth.supabase).update(payload).eq('id', id).select().single(),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const deleteCategory = (auth: AuthContextFull, id: string) =>
  ResultAsync.fromPromise(
    catTable(auth.supabase).delete().eq('id', id),
    dbError
  ).andThen(fromSupabaseVoid())

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

type CreatePayload = z.infer<typeof createShopCategorySchema>
type UpdatePayload = z.infer<typeof updateShopCategorySchema>

function buildCreatePayload(data: CreatePayload): Record<string, unknown> {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    sort_order: data.sort_order ?? 0,
  }
}

function buildUpdatePayload(data: UpdatePayload): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (data.name !== undefined) payload.name = data.name
  if (data.slug !== undefined) payload.slug = data.slug
  if (data.description !== undefined) payload.description = data.description || null
  if (data.sort_order !== undefined) payload.sort_order = data.sort_order

  return payload
}
