import type { Tables } from '@agency/database'

// --- Media type union (matches DB CHECK constraint) ---

export type MediaType = 'image' | 'video' | 'youtube' | 'vimeo' | 'instagram' | 'tiktok'

// --- Full media item (no JSONB overrides needed — all scalar columns) ---

export type MediaItem = Tables<'media_items'>

// --- List view subset (exclude dimension fields not needed in grid/table) ---

export type MediaItemListItem = Pick<
  Tables<'media_items'>,
  | 'id'
  | 'name'
  | 'type'
  | 'url'
  | 'mime_type'
  | 'size_bytes'
  | 'thumbnail_url'
  | 'folder_id'
  | 'created_at'
>

// --- Cast helper (for consistency with blog pattern) ---

export function toMediaItem(raw: unknown): MediaItem {
  return raw as Tables<'media_items'>
}

export function toMediaItemListItem(raw: unknown): MediaItemListItem {
  const row = raw as Tables<'media_items'>
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    thumbnail_url: row.thumbnail_url,
    folder_id: row.folder_id,
    created_at: row.created_at,
  }
}
