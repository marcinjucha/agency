import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { VentureCampaignList } from '@/features/venture/components/VentureCampaignList'

export const Route = createFileRoute('/admin/venture/')({
  head: () => buildCmsHead(messages.venture.campaignsTitle),
  component: VentureCampaignsPage,
})

function VentureCampaignsPage() {
  return <VentureCampaignList />
}
