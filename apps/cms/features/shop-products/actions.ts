'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createShopProductSchema, updateShopProductSchema, type CreateShopProductFormData } from './validation'
import { toShopProduct, type ShopProduct } from './types'
import { generateSlug } from './utils'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// --- Server Actions ---

export async function createShopProduct(
  data: CreateShopProductFormData
): Promise<{ success: boolean; data?: ShopProduct; error?: string }> {
  try {
    const parsed = createShopProductSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('shop.products', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }
    const { supabase, tenantId } = auth

    const slug = parsed.data.slug || generateSlug(parsed.data.title)

    const insertPayload = {
      tenant_id: tenantId,
      title: parsed.data.title,
      slug,
      listing_type: parsed.data.listing_type,
      display_layout: parsed.data.display_layout ?? 'gallery',
      short_description: parsed.data.short_description || null,
      description: parsed.data.description || null,
      html_body: parsed.data.html_body || null,
      cover_image_url: parsed.data.cover_image_url || null,
      images: parsed.data.images || null,
      price: parsed.data.price ?? null,
      currency: parsed.data.currency ?? 'PLN',
      external_url: parsed.data.external_url || null,
      digital_file_url: parsed.data.digital_file_url || null,
      digital_file_name: parsed.data.digital_file_name || null,
      digital_file_size: parsed.data.digital_file_size ?? null,
      category_id: parsed.data.category_id || null,
      tags: parsed.data.tags || null,
      sort_order: parsed.data.sort_order ?? 0,
      seo_metadata: parsed.data.seo_metadata || null,
      is_featured: parsed.data.is_featured ?? false,
      is_published: parsed.data.is_published,
      published_at: parsed.data.is_published
        ? (parsed.data.published_at || new Date().toISOString())
        : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never (Supabase JS v2.95.2 + PostgrestVersion 13 incompatibility)
    const { data: created, error } = await (supabase as any)
      .from('shop_products')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopProducts)
    return { success: true, data: toShopProduct(created) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function updateShopProduct(
  id: string,
  data: Partial<CreateShopProductFormData>
): Promise<{ success: boolean; data?: ShopProduct; error?: string }> {
  try {
    const parsed = updateShopProductSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('shop.products', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_products type resolves to never (Supabase JS v2.95.2 incompatibility)
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('shop_products')
      .select('published_at')
      .eq('id', id)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    // Determine published_at value (4-way branch)
    let published_at: string | null | undefined
    if (parsed.data.is_published !== undefined) {
      if (!parsed.data.is_published) {
        published_at = null
      } else if (parsed.data.published_at) {
        published_at = parsed.data.published_at
      } else if (!existing.published_at) {
        published_at = new Date().toISOString()
      } else {
        published_at = existing.published_at
      }
    }

    const updatePayload: Record<string, unknown> = {}

    if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title
    if (parsed.data.slug !== undefined) updatePayload.slug = parsed.data.slug
    if (parsed.data.listing_type !== undefined) updatePayload.listing_type = parsed.data.listing_type
    if (parsed.data.display_layout !== undefined) updatePayload.display_layout = parsed.data.display_layout
    if (parsed.data.short_description !== undefined) updatePayload.short_description = parsed.data.short_description || null
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null
    if (parsed.data.html_body !== undefined) updatePayload.html_body = parsed.data.html_body || null
    if (parsed.data.cover_image_url !== undefined) updatePayload.cover_image_url = parsed.data.cover_image_url || null
    if (parsed.data.images !== undefined) updatePayload.images = parsed.data.images || null
    if (parsed.data.price !== undefined) updatePayload.price = parsed.data.price ?? null
    if (parsed.data.currency !== undefined) updatePayload.currency = parsed.data.currency
    if (parsed.data.external_url !== undefined) updatePayload.external_url = parsed.data.external_url || null
    if (parsed.data.digital_file_url !== undefined) updatePayload.digital_file_url = parsed.data.digital_file_url || null
    if (parsed.data.digital_file_name !== undefined) updatePayload.digital_file_name = parsed.data.digital_file_name || null
    if (parsed.data.digital_file_size !== undefined) updatePayload.digital_file_size = parsed.data.digital_file_size ?? null
    if (parsed.data.category_id !== undefined) updatePayload.category_id = parsed.data.category_id || null
    if (parsed.data.tags !== undefined) updatePayload.tags = parsed.data.tags || null
    if (parsed.data.sort_order !== undefined) updatePayload.sort_order = parsed.data.sort_order
    if (parsed.data.seo_metadata !== undefined) updatePayload.seo_metadata = parsed.data.seo_metadata || null
    if (parsed.data.is_featured !== undefined) updatePayload.is_featured = parsed.data.is_featured
    if (parsed.data.is_published !== undefined) updatePayload.is_published = parsed.data.is_published
    if (published_at !== undefined) updatePayload.published_at = published_at

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never
    const { data: updated, error } = await (supabase as any)
      .from('shop_products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopProducts)
    revalidatePath(routes.admin.shopProduct(id))
    return { success: true, data: toShopProduct(updated) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function deleteShopProduct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('shop.products', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never
    const { error } = await (supabase as any)
      .from('shop_products')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopProducts)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function toggleShopProductPublished(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('shop.products', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_products type resolves to never (Supabase JS v2.95.2 incompatibility)
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('shop_products')
      .select('published_at')
      .eq('id', id)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    const published_at = isPublished
      ? (existing.published_at || new Date().toISOString())
      : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert resolves to never
    const { error } = await (supabase as any)
      .from('shop_products')
      .update({ is_published: isPublished, published_at })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopProducts)
    revalidatePath(routes.admin.shopProduct(id))
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
