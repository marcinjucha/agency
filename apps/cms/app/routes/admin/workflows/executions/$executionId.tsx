import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { getExecutionWithSteps } from '@/features/workflows/queries'
import { ExecutionDetail } from '@/features/workflows/components/ExecutionDetail'

export const Route = createFileRoute('/admin/workflows/executions/$executionId')({
  head: () => buildCmsHead(messages.workflows.executionDetailTitle),
  loader: ({ params, context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.executions.detail(params.executionId),
      queryFn: () => getExecutionWithSteps(params.executionId),
    })
  },
  component: ExecutionDetailPage,
})

function ExecutionDetailPage() {
  const { executionId } = Route.useParams()
  return <ExecutionDetail executionId={executionId} />
}
