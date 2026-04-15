import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedLegalPageFn } from '@/features/legal/server'
import { LegalPageContent } from '@/features/legal/components/LegalPageContent'
import { buildWebsiteHead } from '@/lib/head'

export const Route = createFileRoute('/regulamin')({
  loader: async () => {
    const page = await getPublishedLegalPageFn({ data: { slug: 'regulamin' } })
    if (!page) throw notFound()
    return { page }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.page?.title
      ? `${loaderData.page.title} | Halo Efekt`
      : 'Regulamin | Halo Efekt'

    return {
      ...buildWebsiteHead(title),
      meta: [
        ...buildWebsiteHead(title).meta,
        // Legal pages are not indexed (duplicate content concern, internal only)
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  }),
  component: RegulaminPage,
})

function RegulaminPage() {
  const { page } = Route.useLoaderData()
  return <LegalPageContent page={page} />
}
