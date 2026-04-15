import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  getWorkflowFn,
  getSurveysForWorkflowFn,
  getEmailTemplatesForWorkflowFn,
} from '@/features/workflows/server'
import { WorkflowEditor } from '@/features/workflows/components/WorkflowEditor'

export const Route = createFileRoute('/admin/workflows/$workflowId')({
  head: () => buildCmsHead(messages.nav.workflows),
  loader: async ({ params }) => {
    const [workflow, surveys, emailTemplates] = await Promise.all([
      getWorkflowFn({ data: { id: params.workflowId } }),
      getSurveysForWorkflowFn(),
      getEmailTemplatesForWorkflowFn(),
    ])
    return { workflow, surveys, emailTemplates }
  },
  component: WorkflowEditorPage,
})

function WorkflowEditorPage() {
  const { workflow, surveys, emailTemplates } = Route.useLoaderData()
  return (
    <WorkflowEditor
      workflow={workflow}
      surveys={surveys}
      emailTemplates={emailTemplates}
    />
  )
}
