import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getWorkflowsFn } from '@/features/workflows/server'
import { WorkflowList } from '@/features/workflows/components/WorkflowList'

export const Route = createFileRoute('/admin/workflows/')({
  head: () => buildCmsHead(messages.nav.workflows),
  loader: async () => {
    const workflows = await getWorkflowsFn()
    return { workflows }
  },
  component: WorkflowsPage,
})

function WorkflowsPage() {
  const { workflows } = Route.useLoaderData()
  return <WorkflowList initialWorkflows={workflows} />
}
