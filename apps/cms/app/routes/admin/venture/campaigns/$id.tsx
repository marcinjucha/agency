import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { FileX } from 'lucide-react'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { listCampaignsFn } from '@/features/venture/admin.server'
import { VentureCampaignEditor } from '@/features/venture/components/VentureCampaignEditor'

export const Route = createFileRoute('/admin/venture/campaigns/$id')({
  head: () => buildCmsHead(messages.venture.editCampaign),
  component: VentureCampaignEditorPage,
})

function VentureCampaignEditorPage() {
  const { id } = Route.useParams()

  // No single-get server fn exists (5a) — resolve the campaign from the list.
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.venture.campaigns(),
    queryFn: async () => {
      const result = await listCampaignsFn({ data: {} })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadCampaignsFailed)
      return result.data ?? []
    },
  })

  if (isLoading) return <LoadingState variant="skeleton-card" rows={4} />
  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : messages.common.errorOccurred} />
  }

  const campaign = data?.find((c) => c.id === id)
  if (!campaign) {
    return (
      <EmptyState
        icon={FileX}
        title={messages.venture.campaignNotFound}
        description={messages.venture.campaignNotFoundDescription}
      />
    )
  }

  return <VentureCampaignEditor campaign={campaign} />
}
