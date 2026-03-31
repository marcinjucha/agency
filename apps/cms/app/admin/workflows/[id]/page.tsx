import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkflowServer } from '@/features/workflows/queries.server'
import { WorkflowDetail } from '@/features/workflows/components/WorkflowDetail'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function WorkflowPage({ params }: PageProps) {
  const { id } = await params

  let workflow
  try {
    workflow = await getWorkflowServer(id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href={routes.admin.workflows}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; {messages.workflows.backToWorkflows}
      </Link>
      <WorkflowDetail workflow={workflow} />
    </div>
  )
}
