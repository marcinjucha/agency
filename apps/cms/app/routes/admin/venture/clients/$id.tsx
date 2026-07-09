import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { FileX } from 'lucide-react'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { listClientsFn } from '@/features/venture/admin'
import { VentureClientEditor } from '@/features/venture/components/VentureClientEditor'

export const Route = createFileRoute('/admin/venture/clients/$id')({
  head: () => buildCmsHead(messages.venture.editClient),
  component: VentureClientEditorPage,
})

function VentureClientEditorPage() {
  const { id } = Route.useParams()

  // No single-get server fn exists (mirrors campaign editor) — resolve the
  // client from the list.
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.venture.clients,
    queryFn: async () => {
      const result = await listClientsFn()
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadClientsFailed)
      return result.data ?? []
    },
  })

  if (isLoading) return <LoadingState variant="skeleton-card" rows={4} />
  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : messages.common.errorOccurred} />
  }

  const client = data?.find((c) => c.id === id)
  if (!client) {
    return (
      <EmptyState
        icon={FileX}
        title={messages.venture.clientNotFound}
        description={messages.venture.clientNotFoundDescription}
      />
    )
  }

  return <VentureClientEditor client={client} />
}
