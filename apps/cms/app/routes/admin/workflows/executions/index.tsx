import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ExecutionList } from '@/features/workflows/components/ExecutionList'

export const Route = createFileRoute('/admin/workflows/executions/')({
  head: () => buildCmsHead(messages.workflows.executionsTitle),
  component: ExecutionsPage,
})

function ExecutionsPage() {
  return <ExecutionList />
}
