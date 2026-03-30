'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import {
  createFolderSchema,
  renameFolderSchema,
  type CreateFolderFormData,
  type RenameFolderFormData,
} from './folder-validation'
import type { MediaFolder } from './folder-types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export async function createFolder(
  data: CreateFolderFormData
): Promise<{ success: boolean; data?: MediaFolder; error?: string }> {
  try {
    const parsed = createFolderSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? messages.media.invalidData,
      }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_folders not in generated client types
    const { data: created, error } = await (supabase as any)
      .from('media_folders')
      .insert({
        tenant_id: tenantId,
        name: parsed.data.name,
        parent_id: parsed.data.parent_id ?? null,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.media)
    return { success: true, data: created as MediaFolder }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : messages.media.createFolderFailed
    return { success: false, error: message }
  }
}

export async function renameFolder(
  id: string,
  data: RenameFolderFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = renameFolderSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? messages.media.invalidData,
      }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_folders not in generated client types
    const { error } = await (supabase as any)
      .from('media_folders')
      .update({ name: parsed.data.name })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.media)
    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : messages.media.renameFolderFailed
    return { success: false, error: message }
  }
}

export async function deleteFolder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

    // Items in this folder get folder_id=NULL via ON DELETE SET NULL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_folders not in generated client types
    const { error } = await (supabase as any)
      .from('media_folders')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.media)
    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : messages.media.deleteFolderFailed
    return { success: false, error: message }
  }
}

export async function moveMediaToFolder(
  itemId: string,
  folderId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_items not in generated client types
    const { error } = await (supabase as any)
      .from('media_items')
      .update({ folder_id: folderId })
      .eq('id', itemId)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.media)
    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : messages.media.moveFailed
    return { success: false, error: message }
  }
}
