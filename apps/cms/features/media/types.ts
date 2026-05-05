import type { Tables } from '@agency/database'

// --- Media type union (matches DB CHECK constraint) ---

export const MEDIA_TYPES = {
  image: 'image',
  video: 'video',
  youtube: 'youtube',
  vimeo: 'vimeo',
  instagram: 'instagram',
  tiktok: 'tiktok',
  document: 'document',
  audio: 'audio',
} as const

export type MediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES]

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
  | 'is_downloadable'
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
    is_downloadable: row.is_downloadable,
    created_at: row.created_at,
  }
}
