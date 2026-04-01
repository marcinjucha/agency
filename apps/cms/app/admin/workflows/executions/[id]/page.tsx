import type { Metadata } from 'next'
import { getExecutionWithStepsServer } from '@/features/workflows/queries.server'
import { ExecutionDetail } from '@/features/workflows/components/ExecutionDetail'
import { messages } from '@/lib/messages'

export const metadata: Metadata = {
  title: messages.workflows.executionDetailMetaTitle,
}

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const initialData = await getExecutionWithStepsServer(id).catch(() => null)

  return (
    <ExecutionDetail
      executionId={id}
      initialData={initialData ?? undefined}
    />
  )
}
