'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, S3_BUCKET } from '@/lib/s3'
import {
  createMediaItemSchema,
  updateMediaItemSchema,
  type CreateMediaItemFormData,
  type UpdateMediaItemFormData,
} from './validation'
import { toMediaItem, type MediaItem } from './types'
import { messages } from '@/lib/messages'

export async function createMediaItem(
  data: CreateMediaItemFormData
): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const parsed = createMediaItemSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? messages.media.invalidData,
      }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    const insertPayload = {
      tenant_id: tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      url: parsed.data.url,
      s3_key: parsed.data.s3_key ?? null,
      mime_type: parsed.data.mime_type ?? null,
      size_bytes: parsed.data.size_bytes ?? null,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_items not in generated types
    const { data: created, error } = await (supabase as any)
      .from('media_items')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/media')
    return { success: true, data: toMediaItem(created) }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.media.unknownError
    return { success: false, error: message }
  }
}

export async function updateMediaItem(
  id: string,
  data: UpdateMediaItemFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = updateMediaItemSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? messages.media.invalidData,
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: messages.common.notLoggedIn }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_items not in generated types
    const { error } = await (supabase as any)
      .from('media_items')
      .update({ name: parsed.data.name })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/media')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.media.unknownError
    return { success: false, error: message }
  }
}

export async function deleteMediaItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: messages.common.notLoggedIn }

    // Fetch the item first to get s3_key for S3 cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_items not in generated types
    const { data: item, error: fetchError } = await (supabase as any)
      .from('media_items')
      .select('s3_key')
      .eq('id', id)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    // Delete from S3 if the item has an s3_key (uploaded files, not embeds)
    if (item?.s3_key) {
      const s3 = getS3Client()
      await s3.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: item.s3_key,
        })
      )
    }

    // Delete DB row (RLS ensures tenant isolation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_items not in generated types
    const { error } = await (supabase as any)
      .from('media_items')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/media')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.media.unknownError
    return { success: false, error: message }
  }
}
