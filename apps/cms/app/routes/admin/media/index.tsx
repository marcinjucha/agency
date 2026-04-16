import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getMediaItemsFn } from '@/features/media/server'
import { mediaKeys } from '@/features/media/queries'
import { MediaLibrary } from '@/features/media/components/MediaLibrary'

export const Route = createFileRoute('/admin/media/')({
  head: () => buildCmsHead(messages.nav.media),
  loader: ({ context: { queryClient } }) => {
    // Non-blocking prefetch — renders immediately with loading state
    // folder_id undefined = all items (backward compat default)
    queryClient.prefetchQuery({
      queryKey: mediaKeys.list({ type: undefined, folder_id: undefined }),
      queryFn: () => getMediaItemsFn({ data: {} }),
    })
  },
  component: MediaPage,
})

function MediaPage() {
  return <MediaLibrary />
}
