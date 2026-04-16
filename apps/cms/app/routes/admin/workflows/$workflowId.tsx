import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { WorkflowEditor } from '@/features/workflows/components/WorkflowEditor'

export const Route = createFileRoute('/admin/workflows/$workflowId')({
  head: () => buildCmsHead(messages.nav.workflows),
  component: WorkflowEditorPage,
})

function WorkflowEditorPage() {
  const { workflowId } = Route.useParams()
  // WorkflowEditor uses useQuery internally — data already in cache from loader above.
  return <WorkflowEditor workflowId={workflowId} />
}
