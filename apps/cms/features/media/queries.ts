import type { MediaType } from './types'

// TanStack Query key factory — used by InsertMediaModal + MediaLibrary
// (data fetching itself lives in `./server.ts` via createServerFn)
export const mediaKeys = {
  all: ['media-items'] as const,
  list: (filters?: { type?: MediaType; search?: string; folder_id?: string | null }) =>
    ['media-items', 'list', filters] as const,
  detail: (id: string) => ['media-items', 'detail', id] as const,
}
