import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  getWorkflowFn,
  getSurveysForWorkflowFn,
  getEmailTemplatesForWorkflowFn,
} from '@/features/workflows/server'
import { queryKeys } from '@/lib/query-keys'
import { WorkflowEditor } from '@/features/workflows/components/WorkflowEditor'

export const Route = createFileRoute('/admin/workflows/$workflowId')({
  head: () => buildCmsHead(messages.nav.workflows),
  // Pre-populate all 3 query caches in parallel.
  // WorkflowEditor + TriggerConfigPanel + SendEmailConfigPanel each use their own
  // useQuery with matching keys — data is already in cache so they render instantly.
  loader: ({ context: { queryClient }, params }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.workflows.detail(params.workflowId),
      queryFn: async () => {
        const data = await getWorkflowFn({ data: { id: params.workflowId } })
        return data
      },
    })
    queryClient.prefetchQuery({
      queryKey: queryKeys.workflows.surveys,
      queryFn: async () => {
        const data = await getSurveysForWorkflowFn()
        return data
      },
    })
    queryClient.prefetchQuery({
      queryKey: queryKeys.workflows.emailTemplates,
      queryFn: async () => {
        const data = await getEmailTemplatesForWorkflowFn()
        return data
      },
    })
  },
  component: WorkflowEditorPage,
})

function WorkflowEditorPage() {
  const { workflowId } = Route.useParams()
  // WorkflowEditor uses useQuery internally — data already in cache from loader above.
  return <WorkflowEditor workflowId={workflowId} />
}
