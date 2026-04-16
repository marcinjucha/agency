import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedLegalPageFn } from '@/features/legal/server'
import { LegalPageContent } from '@/features/legal/components/LegalPageContent'
import { buildWebsiteHead } from '@/lib/head'
import { CACHE_STATIC } from '@/lib/cache-headers'

export const Route = createFileRoute('/polityka-prywatnosci')({
  loader: async () => {
    const page = await getPublishedLegalPageFn({ data: { slug: 'polityka-prywatnosci' } })
    if (!page) throw notFound()
    return { page }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.page?.title
      ? `${loaderData.page.title} | Halo Efekt`
      : 'Polityka Prywatności | Halo Efekt'

    return {
      ...buildWebsiteHead(title),
      meta: [
        ...buildWebsiteHead(title).meta,
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
  headers: () => CACHE_STATIC,
  component: PolitykaPrywatnosciPage,
})

function PolitykaPrywatnosciPage() {
  const { page } = Route.useLoaderData()
  return <LegalPageContent page={page} />
}
