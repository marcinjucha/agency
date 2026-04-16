import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ExecutionDetail } from '@/features/workflows/components/ExecutionDetail'

export const Route = createFileRoute('/admin/workflows/executions/$executionId')({
  head: () => buildCmsHead(messages.workflows.executionDetailTitle),
  component: ExecutionDetailPage,
})

function ExecutionDetailPage() {
  const { executionId } = Route.useParams()
  return <ExecutionDetail executionId={executionId} />
}
