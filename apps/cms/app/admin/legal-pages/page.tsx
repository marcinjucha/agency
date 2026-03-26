import { LegalPageList } from '@/features/legal-pages/components/LegalPageList'
import { messages } from '@/lib/messages'

export const metadata = { title: 'Strony prawne | Halo-Efekt CMS' }

export default function LegalPagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{messages.legalPages.title}</h1>
      <LegalPageList />
    </div>
  )
}
