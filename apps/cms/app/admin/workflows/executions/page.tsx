import { ExecutionList } from '@/features/workflows/components/ExecutionList'
import { messages } from '@/lib/messages'

export const metadata = {
  title: messages.workflows.executionsMetaTitle,
}

export default function ExecutionsPage() {
  return <ExecutionList />
}
