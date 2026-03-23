'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, S3_BUCKET } from '@/lib/s3'
import {
  createMediaItemSchema,
  updateMediaItemSchema,
  type CreateMediaItemFormData,
  type UpdateMediaItemFormData,
} from './validation'
import { toMediaItem, type MediaItem } from './types'

export async function createMediaItem(
  data: CreateMediaItemFormData
): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const parsed = createMediaItemSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Nieprawidlowe dane',
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nie zalogowany' }

    // Fetch tenant_id for the authenticated user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      return { success: false, error: 'Nie znaleziono danych uzytkownika' }
    }

    const insertPayload = {
      tenant_id: userData.tenant_id,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase as any)
      .from('media_items')
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin/media')
    return { success: true, data: toMediaItem(created) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany blad'
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
        error: parsed.error.errors[0]?.message ?? 'Nieprawidlowe dane',
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nie zalogowany' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('media_items')
      .update({ name: parsed.data.name })
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/media')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany blad'
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
    if (!user) return { success: false, error: 'Nie zalogowany' }

    // Fetch the item first to get s3_key for S3 cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: item, error: fetchError } = await (supabase as any)
      .from('media_items')
      .select('s3_key')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('media_items')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/media')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany blad'
    return { success: false, error: message }
  }
}
