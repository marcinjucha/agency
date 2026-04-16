import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { WorkflowList } from '@/features/workflows/components/WorkflowList'

export const Route = createFileRoute('/admin/workflows/')({
  head: () => buildCmsHead(messages.nav.workflows),
  component: WorkflowsPage,
})

function WorkflowsPage() {
  // WorkflowList owns its own useQuery — data already in cache from loader above.
  return <WorkflowList />
}
