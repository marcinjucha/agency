import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedLegalPage } from '@/features/legal/queries'
import { LegalPageContent } from '@/features/legal/components/LegalPageContent'
import { messages } from '@/lib/messages'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedLegalPage('polityka-prywatnosci')

  if (!page) {
    return { title: messages.legal.notFoundTitle }
  }

  return {
    title: `${page.title} | Halo Efekt`,
  }
}

export default async function PolitykaPrywatnosciPage() {
  const page = await getPublishedLegalPage('polityka-prywatnosci')

  if (!page) notFound()

  return <LegalPageContent page={page} />
}
