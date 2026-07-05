import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { VentureClientList } from '@/features/venture/components/VentureClientList'

export const Route = createFileRoute('/admin/venture/clients/')({
  head: () => buildCmsHead(messages.venture.clientsTitle),
  component: VentureClientsPage,
})

function VentureClientsPage() {
  return <VentureClientList />
}
