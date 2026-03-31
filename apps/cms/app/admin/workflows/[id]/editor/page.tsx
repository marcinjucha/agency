import { notFound } from 'next/navigation'
import { getWorkflowServer } from '@/features/workflows/queries.server'
import { WorkflowEditor } from '@/features/workflows/components/WorkflowEditor'

type PageProps = {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Edytor workflow | Halo-Efekt CMS',
}

export default async function WorkflowEditorPage({ params }: PageProps) {
  const { id } = await params

  let workflow
  try {
    workflow = await getWorkflowServer(id)
  } catch {
    notFound()
  }

  return <WorkflowEditor workflow={workflow} />
}
