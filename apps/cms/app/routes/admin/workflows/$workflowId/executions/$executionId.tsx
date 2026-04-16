import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ExecutionDetail } from '@/features/workflows/components/ExecutionDetail'

export const Route = createFileRoute(
  '/admin/workflows/$workflowId/executions/$executionId'
)({
  head: () => buildCmsHead(messages.workflows.navExecutions),
  component: ExecutionDetailPage,
})

function ExecutionDetailPage() {
  const { executionId } = Route.useParams()
  // ExecutionDetail keeps its own useQuery with refetchInterval for live polling.
  // Do NOT use a loader here — polling requires client-side refetch control.
  return <ExecutionDetail executionId={executionId} />
}
