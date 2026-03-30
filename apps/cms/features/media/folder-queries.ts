import { createClient } from '@/lib/supabase/client'
import type { MediaFolder } from './folder-types'

// TanStack Query key factory
export const folderKeys = {
  all: ['media-folders'] as const,
  list: ['media-folders', 'list'] as const,
}

export async function getMediaFolders(): Promise<MediaFolder[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- media_folders not in generated client types
  const { data, error } = await (supabase as any)
    .from('media_folders')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as MediaFolder[]
}
