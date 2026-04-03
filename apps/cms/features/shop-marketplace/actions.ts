'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { isMarketplaceRegistered } from './adapters/registry'
import type { MarketplaceId } from './types'
import {
  connectMarketplaceSchema,
  publishListingSchema,
  updateListingSchema,
  createImportSchema,
  type ConnectMarketplaceFormData,
  type PublishListingFormData,
  type UpdateListingFormData,
  type CreateImportFormData,
} from './validation'

// --- N8n dispatch helper ---

function dispatchMarketplaceWebhook(payload: Record<string, unknown>): void {
  const url = process.env.N8N_MARKETPLACE_WEBHOOK_URL
  const secret = process.env.WORKFLOW_TRIGGER_SECRET
  if (!url) {
    console.error('[marketplace] N8N_MARKETPLACE_WEBHOOK_URL not configured')
    return
  }
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('[marketplace] n8n dispatch failed:', err)
  })
}

// --- Server Actions ---

export async function connectMarketplace(
  data: ConnectMarketplaceFormData
): Promise<{ success: true; data: { authUrl: string } } | { success: false; error: string }> {
  const auth = await getUserWithTenant()
  if (isAuthError(auth)) return { success: false, error: auth.error }

  const parsed = connectMarketplaceSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
  }

  const { marketplace } = parsed.data

  if (!isMarketplaceRegistered(marketplace as MarketplaceId)) {
    return { success: false, error: messages.marketplace.adapterNotAvailable }
  }

  // Return auth URL for client-side redirect (Server Actions can't redirect to external URLs)
  const host = process.env.HOST_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!host) {
    console.error('[marketplace] Missing HOST_URL or NEXT_PUBLIC_APP_URL environment variable')
    return { success: false, error: messages.common.unknownError }
  }
  const authUrl = `${host}/api/marketplace/auth/${marketplace}`

  return { success: true, data: { authUrl } }
}

export async function disconnectMarketplace(
  connectionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
    const { error } = await (supabase as any)
      .from('shop_marketplace_connections')
      .delete()
      .eq('id', connectionId)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.shopMarketplace)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function publishToMarketplace(
  data: PublishListingFormData
): Promise<{ success: true; data: { listingId: string } } | { success: false; error: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    const parsed = publishListingSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const { productId, connectionId, marketplaceCategoryId, marketplaceLocation, marketplaceParams } = parsed.data

    // Verify connection belongs to this tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
    const { data: connection, error: connError } = await (supabase as any)
      .from('shop_marketplace_connections')
      .select('id, marketplace, is_active')
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (connError || !connection) {
      return { success: false, error: messages.marketplace.connectionNotFound }
    }

    // Fetch product for n8n payload (title, description, price, images)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_products not in generated types
    const { data: product, error: productError } = await (supabase as any)
      .from('shop_products')
      .select('id, title, short_description, price, currency, images, is_published')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (productError || !product) {
      return { success: false, error: messages.marketplace.productNotFound }
    }

    // Upsert listing — conflict on (product_id, connection_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { data: listing, error: upsertError } = await (supabase as any)
      .from('shop_marketplace_listings')
      .upsert(
        {
          tenant_id: tenantId,
          product_id: productId,
          connection_id: connectionId,
          marketplace: connection.marketplace,
          status: 'publishing',
          marketplace_category_id: marketplaceCategoryId ?? null,
          marketplace_location: marketplaceLocation ?? null,
          marketplace_params: marketplaceParams ?? null,
        },
        { onConflict: 'product_id,connection_id', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (upsertError || !listing) {
      return { success: false, error: messages.marketplace.publishFailed }
    }

    // Fire-and-forget n8n dispatch
    dispatchMarketplaceWebhook({
      action: 'publish',
      listing_id: listing.id,
      connection_id: connectionId,
      product_id: productId,
      publish_payload: {
        title: product.title,
        description: product.short_description,
        price: product.price,
        currency: product.currency ?? 'PLN',
        images: product.images ?? [],
        categoryId: marketplaceCategoryId,
        location: marketplaceLocation,
        ...(marketplaceParams ?? {}),
      },
    })

    revalidatePath(routes.admin.shopMarketplace)
    return { success: true, data: { listingId: listing.id } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function updateMarketplaceListing(
  listingId: string,
  data: UpdateListingFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    const parsed = updateListingSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    // Fetch listing — verify it belongs to tenant and get external_listing_id for n8n
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('shop_marketplace_listings')
      .select('id, external_listing_id, connection_id, product_id')
      .eq('id', listingId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (fetchError || !existing) {
      return { success: false, error: messages.marketplace.listingNotFound }
    }

    // Fetch product for n8n payload (title, description, price, images)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_products not in generated types
    const { data: product, error: productError } = await (supabase as any)
      .from('shop_products')
      .select('id, title, short_description, price, currency, images')
      .eq('id', existing.product_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (productError || !product) {
      return { success: false, error: messages.marketplace.productNotFound }
    }

    const { marketplaceCategoryId, marketplaceLocation, marketplaceParams } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { error: updateError } = await (supabase as any)
      .from('shop_marketplace_listings')
      .update({
        status: 'publishing',
        ...(marketplaceCategoryId !== undefined ? { marketplace_category_id: marketplaceCategoryId } : {}),
        ...(marketplaceLocation !== undefined ? { marketplace_location: marketplaceLocation } : {}),
        ...(marketplaceParams !== undefined ? { marketplace_params: marketplaceParams } : {}),
      })
      .eq('id', listingId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      return { success: false, error: messages.marketplace.updateFailed }
    }

    // Fire-and-forget n8n dispatch
    dispatchMarketplaceWebhook({
      action: 'update',
      listing_id: listingId,
      connection_id: existing.connection_id,
      product_id: existing.product_id,
      external_listing_id: existing.external_listing_id,
      publish_payload: {
        title: product.title,
        description: product.short_description,
        price: product.price,
        currency: product.currency ?? 'PLN',
        images: product.images ?? [],
        ...(marketplaceCategoryId !== undefined ? { categoryId: marketplaceCategoryId } : {}),
        ...(marketplaceLocation !== undefined ? { location: marketplaceLocation } : {}),
        ...(marketplaceParams ?? {}),
      },
    })

    revalidatePath(routes.admin.shopMarketplace)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function removeMarketplaceListing(
  listingId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    // Fetch listing — verify it belongs to tenant and get external_listing_id for n8n
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('shop_marketplace_listings')
      .select('id, external_listing_id, connection_id')
      .eq('id', listingId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (fetchError || !existing) {
      return { success: false, error: messages.marketplace.listingNotFound }
    }

    // Mark as removed optimistically — n8n handles external API removal
    // DB CHECK constraint: 'draft' | 'publishing' | 'active' | 'sold' | 'expired' | 'removed' | 'error'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { error: updateError } = await (supabase as any)
      .from('shop_marketplace_listings')
      .update({ status: 'removed' })
      .eq('id', listingId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      return { success: false, error: messages.marketplace.removeFailed }
    }

    // Fire-and-forget n8n dispatch (handles platform-specific removal, e.g. Allegro PATCH)
    dispatchMarketplaceWebhook({
      action: 'remove',
      listing_id: listingId,
      connection_id: existing.connection_id,
      external_listing_id: existing.external_listing_id,
    })

    revalidatePath(routes.admin.shopMarketplace)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function startMarketplaceImport(
  data: CreateImportFormData,
  selectedListingIds: string[]
): Promise<{ success: true; data: { importId: string } } | { success: false; error: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    const parsed = createImportSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const { connectionId } = parsed.data

    // Validate connection belongs to this tenant + get marketplace type for import record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
    const { data: connection, error: connError } = await (supabase as any)
      .from('shop_marketplace_connections')
      .select('id, marketplace, is_active')
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (connError || !connection) {
      return { success: false, error: messages.marketplace.connectionNotFound }
    }

    // Create import record using service role — shop_marketplace_imports has SELECT-only RLS policy
    // service_role bypasses RLS for the INSERT
    const serviceSupabase = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_imports not in generated types
    const { data: importRecord, error: insertError } = await (serviceSupabase as any)
      .from('shop_marketplace_imports')
      .insert({
        tenant_id: tenantId,
        connection_id: connectionId,
        marketplace: connection.marketplace,
        status: 'pending',
        total_items: selectedListingIds.length,
      })
      .select('id')
      .single()

    if (insertError || !importRecord) {
      console.error('[marketplace-import] Failed to create import record:', insertError?.message)
      return { success: false, error: messages.marketplace.importFailed }
    }

    // Fire-and-forget dispatch to n8n
    dispatchMarketplaceWebhook({
      action: 'import',
      import_id: importRecord.id,
      connection_id: connectionId,
      listing_ids: selectedListingIds,
      tenant_id: tenantId,
    })

    revalidatePath(routes.admin.shopMarketplace)
    return { success: true, data: { importId: importRecord.id } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
