'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
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

// --- Server Actions ---

export async function connectMarketplace(
  _data: ConnectMarketplaceFormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = connectMarketplaceSchema.safeParse(_data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
  }

  // Stub — OAuth flow implemented in iteration 3
  return { success: false, error: 'Nie zaimplementowano — flow OAuth w iteracji 3' }
}

export async function disconnectMarketplace(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
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
  _data: PublishListingFormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = publishListingSchema.safeParse(_data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
  }

  // Stub — publishing implemented in iteration 4
  return { success: false, error: 'Nie zaimplementowano — publikacja w iteracji 4' }
}

export async function updateMarketplaceListing(
  _listingId: string,
  _data: UpdateListingFormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateListingSchema.safeParse(_data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
  }

  // Stub — listing update implemented in iteration 4
  return { success: false, error: 'Nie zaimplementowano — aktualizacja w iteracji 4' }
}

export async function removeMarketplaceListing(
  _listingId: string
): Promise<{ success: boolean; error?: string }> {
  // Stub — listing removal implemented in iteration 4
  return { success: false, error: 'Nie zaimplementowano — usuwanie w iteracji 4' }
}

export async function startMarketplaceImport(
  _data: CreateImportFormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = createImportSchema.safeParse(_data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
  }

  // Stub — import implemented in iteration 5
  return { success: false, error: 'Nie zaimplementowano — import w iteracji 5' }
}
