import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { VentureCampaignEditor } from '@/features/venture/components/VentureCampaignEditor'

export const Route = createFileRoute('/admin/venture/campaigns/new')({
  head: () => buildCmsHead(messages.venture.newCampaign),
  component: VentureCampaignNewPage,
})

function VentureCampaignNewPage() {
  return <VentureCampaignEditor />
}
