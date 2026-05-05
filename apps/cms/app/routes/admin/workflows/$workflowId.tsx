import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { WorkflowEditor } from '@/features/workflows/components/WorkflowEditor'

// Search schema — `?execution=<uuid>` opens the in-editor execution-history
// panel directly to the detail view for that execution. Optional + UUID-shaped
// so a malformed paste falls back to the list view (Zod throws → router treats
// it as no search), instead of opening a panel that 404s on detail fetch.
const workflowEditorSearchSchema = z.object({
  execution: z.string().uuid().optional(),
})

export const Route = createFileRoute('/admin/workflows/$workflowId')({
  validateSearch: (input) => workflowEditorSearchSchema.parse(input),
  head: () => buildCmsHead(messages.nav.workflows),
  component: WorkflowEditorPage,
})

function WorkflowEditorPage() {
  const { workflowId } = Route.useParams()
  // WorkflowEditor reads `?execution` itself via useSearch — kept off props so
  // the editor stays decoupled from the route's exact path.
  return <WorkflowEditor workflowId={workflowId} />
}
