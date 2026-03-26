import { notFound } from 'next/navigation'
import { LegalPageEditor } from '@/features/legal-pages/components/LegalPageEditor'
import { getLegalPageServer } from '@/features/legal-pages/queries.server'

export default async function EditLegalPagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const legalPage = await getLegalPageServer(id)

  if (!legalPage) {
    notFound()
  }

  return <LegalPageEditor legalPage={legalPage} />
}
