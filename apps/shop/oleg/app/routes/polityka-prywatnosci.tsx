import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedLegalPageFn } from '@/features/legal/server'
import { LegalPageContent } from '@/features/legal/components/LegalPageContent'

export const Route = createFileRoute('/polityka-prywatnosci')({
  loader: async () => {
    const page = await getPublishedLegalPageFn({ data: { slug: 'polityka-prywatnosci' } })
    if (!page) throw notFound()
    return { page }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    return {
      meta: [
        { title: `${loaderData.page.title} | Sklep Olega` },
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  }),
  component: PolitykaPrywatnosci,
})

function PolitykaPrywatnosci() {
  const { page } = Route.useLoaderData()
  return <LegalPageContent page={page} />
}
