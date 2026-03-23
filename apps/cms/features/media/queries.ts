import { createClient } from '@/lib/supabase/client'
import type { MediaItem, MediaItemListItem, MediaType } from './types'
import { toMediaItem, toMediaItemListItem } from './types'

// TanStack Query key factory
export const mediaKeys = {
  all: ['media-items'] as const,
  list: (filters?: { type?: MediaType; search?: string }) =>
    ['media-items', 'list', filters] as const,
  detail: (id: string) => ['media-items', 'detail', id] as const,
}

export async function getMediaItems(filters?: {
  type?: MediaType
  search?: string
}): Promise<MediaItemListItem[]> {
  const supabase = createClient()
  let query = supabase
    .from('media_items')
    .select(
      'id, name, type, url, mime_type, size_bytes, thumbnail_url, created_at'
    )
    .order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
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
