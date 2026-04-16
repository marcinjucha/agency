import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { LegalPageList } from '@/features/legal-pages/components/LegalPageList'

export const Route = createFileRoute('/admin/legal-pages/')({
  head: () => buildCmsHead(messages.nav.legalPages),
  component: LegalPagesPage,
})

function LegalPagesPage() {
  return <LegalPageList />
}
