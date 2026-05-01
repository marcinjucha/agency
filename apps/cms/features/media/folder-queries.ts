// TanStack Query key factory — used by MediaLibrary, FolderCreateDialog, InsertMediaModal
// (data fetching itself lives in `./server.ts` via createServerFn)
export const folderKeys = {
  all: ['media-folders'] as const,
  list: ['media-folders', 'list'] as const,
}
