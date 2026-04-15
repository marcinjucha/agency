import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getWorkflowsFn } from '@/features/workflows/server'
import { queryKeys } from '@/lib/query-keys'
import { WorkflowList } from '@/features/workflows/components/WorkflowList'

export const Route = createFileRoute('/admin/workflows/')({
  head: () => buildCmsHead(messages.nav.workflows),
  // Pre-populate TanStack Query cache so WorkflowList renders instantly from cache.
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.workflows.list,
      queryFn: async () => {
        const data = await getWorkflowsFn()
        return data
      },
    }),
  component: WorkflowsPage,
})

function WorkflowsPage() {
  // WorkflowList owns its own useQuery — data already in cache from loader above.
  return <WorkflowList />
}
