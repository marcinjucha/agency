import { createClient } from '@/lib/supabase/client'
import type { MediaItem, MediaItemListItem, MediaType } from './types'
import { toMediaItem, toMediaItemListItem } from './types'

// TanStack Query key factory
export const mediaKeys = {
  all: ['media-items'] as const,
  list: (filters?: { type?: MediaType; search?: string; folder_id?: string | null }) =>
    ['media-items', 'list', filters] as const,
  detail: (id: string) => ['media-items', 'detail', id] as const,
}

/**
 * Fetch media items with optional filters.
 *
 * folder_id behavior:
 * - undefined (default): no folder filter — returns ALL items (backward compat for InsertMediaModal)
 * - null: items without a folder (unsorted/root)
 * - string: items in a specific folder
 */
export async function getMediaItems(filters?: {
  type?: MediaType
  search?: string
  folder_id?: string | null
}): Promise<MediaItemListItem[]> {
  const supabase = createClient()
  let query = supabase
    .from('media_items')
    .select(
      'id, name, type, url, mime_type, size_bytes, thumbnail_url, created_at, folder_id'
    )
    .order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // folder_id filter: undefined = all items, null = unsorted, string = specific folder
  if (filters?.folder_id !== undefined) {
    if (filters.folder_id === null) {
      query = query.is('folder_id', null)
    } else {
      query = query.eq('folder_id', filters.folder_id)
    }
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(toMediaItemListItem)
}

export async function getMediaItem(id: string): Promise<MediaItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Media item not found')
  return toMediaItem(data)
}
