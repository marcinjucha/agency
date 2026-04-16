import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { LegalPageList } from '@/features/legal-pages/components/LegalPageList'

export const Route = createFileRoute('/admin/legal-pages/')({
  head: () => buildCmsHead(messages.nav.legalPages),
  component: LegalPagesPage,
})

function LegalPagesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{messages.nav.legalPages}</h1>
        <p className="text-muted-foreground mt-1">{messages.legalPages.description}</p>
      </div>
      <LegalPageList />
    </div>
  )
}
