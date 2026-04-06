'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { createShopCategorySchema, updateShopCategorySchema, type CreateShopCategoryFormData } from './validation'
import type { ShopCategory } from './types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Server Actions ---

export async function createShopCategory(
  data: CreateShopCategoryFormData
): Promise<{ success: boolean; data?: ShopCategory; error?: string }> {
  try {
    const parsed = createShopCategorySchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('shop.categories')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    const insertPayload = {
      tenant_id: tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      sort_order: parsed.data.sort_order ?? 0,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never (Supabase JS v2.95.2 + PostgrestVersion 13 incompatibility)
    const { data: created, error } = await (supabase as any)
      .from('shop_categories')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopCategories)
    return { success: true, data: created }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function updateShopCategory(
  id: string,
  data: Partial<CreateShopCategoryFormData>
): Promise<{ success: boolean; data?: ShopCategory; error?: string }> {
  try {
    const parsed = updateShopCategorySchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('shop.categories')
    if (!auth.success) return auth
    const { supabase } = auth.data

    const updatePayload: Record<string, unknown> = {}

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
    if (parsed.data.slug !== undefined) updatePayload.slug = parsed.data.slug
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null
    if (parsed.data.sort_order !== undefined) updatePayload.sort_order = parsed.data.sort_order

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never
    const { data: updated, error } = await (supabase as any)
      .from('shop_categories')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopCategories)
    revalidatePath(routes.admin.shopCategory(id))
    return { success: true, data: updated }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function deleteShopCategory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth('shop.categories')
    if (!auth.success) return auth
    const { supabase } = auth.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never
    const { error } = await (supabase as any)
      .from('shop_categories')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopCategories)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
