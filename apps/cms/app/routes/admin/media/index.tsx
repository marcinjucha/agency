import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { MediaLibrary } from '@/features/media/components/MediaLibrary'

export const Route = createFileRoute('/admin/media/')({
  head: () => buildCmsHead(messages.nav.media),
  component: MediaPage,
})

function MediaPage() {
  return <MediaLibrary />
}
