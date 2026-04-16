import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { legalPageKeys, getLegalPages } from '@/features/legal-pages/queries'
import { LegalPageList } from '@/features/legal-pages/components/LegalPageList'

export const Route = createFileRoute('/admin/legal-pages/')({
  head: () => buildCmsHead(messages.nav.legalPages),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: legalPageKeys.all,
      queryFn: getLegalPages,
    })
  },
  component: LegalPagesPage,
})

function LegalPagesPage() {
  return <LegalPageList />
}
