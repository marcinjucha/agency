import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ExecutionList } from '@/features/workflows/components/ExecutionList'

export const Route = createFileRoute('/admin/workflows/$workflowId/executions')({
  head: () => buildCmsHead(messages.workflows.navExecutions),
  component: WorkflowExecutionsPage,
})

function WorkflowExecutionsPage() {
  const { workflowId } = Route.useParams()
  // ExecutionList keeps its own useQuery with refetchInterval for live polling.
  // Do NOT use a loader here — polling requires client-side refetch control.
  return <ExecutionList workflowId={workflowId} />
}
