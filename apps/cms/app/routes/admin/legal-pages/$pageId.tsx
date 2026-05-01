import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState } from '@agency/ui'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { updateLegalPageFn, getLegalPageFn } from '@/features/legal-pages/server'
import { legalPageKeys } from '@/features/legal-pages/queries'
import { LegalPageEditor } from '@/features/legal-pages/components/LegalPageEditor'
import type { LegalPage } from '@/features/legal-pages/types'
import type { LegalPageFormData } from '@/features/legal-pages/validation'

export const Route = createFileRoute('/admin/legal-pages/$pageId')({
  head: () => buildCmsHead(messages.legalPages.editTitle),
  component: LegalPageEditorPage,
})

function LegalPageEditorPage() {
  const { pageId } = Route.useParams()
  const { data: legalPage, isLoading, error } = useQuery<LegalPage>({
    queryKey: legalPageKeys.detail(pageId),
    queryFn: () => getLegalPageFn({ data: { id: pageId } }) as Promise<LegalPage>,
  })

  if (isLoading) return <LoadingState variant="skeleton-table" rows={3} />
  if (error) return <ErrorState title={messages.common.errorOccurred} message={error instanceof Error ? error.message : messages.common.errorOccurred} variant="card" />
  if (!legalPage) return null

  return (
    <LegalPageEditor
      legalPage={legalPage}
      updateFn={(id: string, data: LegalPageFormData) =>
        updateLegalPageFn({ data: { id, data } })
      }
    />
  )
}
