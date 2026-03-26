import type { Tables } from '@agency/database'
import type { TiptapContent } from '../blog/types'

// --- LegalPage with typed JSONB fields ---

export type LegalPage = Omit<Tables<'pages'>, 'blocks'> & {
  blocks: TiptapContent
}

// --- List view subset (avoids fetching full blocks/html_body) ---

export type LegalPageListItem = Pick<
  Tables<'pages'>,
  'id' | 'slug' | 'title' | 'is_published' | 'updated_at'
>

// --- Cast helpers (Supabase returns JSONB as generic Json) ---

export function toLegalPage(raw: unknown): LegalPage {
  const row = raw as Tables<'pages'>
  return {
    ...row,
    blocks: (row.blocks && typeof row.blocks === 'object'
      ? row.blocks
      : { type: 'doc', content: [] }) as unknown as TiptapContent,
  }
}

export function toLegalPageListItem(raw: unknown): LegalPageListItem {
  const row = raw as Tables<'pages'>
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    is_published: row.is_published,
    updated_at: row.updated_at,
  }
}
