import { createFileRoute } from '@tanstack/react-router'
import { getPublishedBlogPostsFn } from '@/features/blog/server'
import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { buildWebsiteHead } from '@/lib/head'

const BLOG_TITLE = 'Blog | Halo Efekt'
const BLOG_DESCRIPTION =
  'Artykuły o AI, automatyzacji i optymalizacji procesów biznesowych. Dowiedz się, jak technologia może usprawnić Twoją firmę.'

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: BLOG_TITLE,
  description: 'Artykuły o AI, automatyzacji i optymalizacji procesów biznesowych.',
  mainEntity: {
    '@type': 'Blog',
    name: 'Blog Halo Efekt',
  },
}

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const posts = await getPublishedBlogPostsFn()
    return { posts }
  },
  head: () => ({
    ...buildWebsiteHead(BLOG_TITLE, BLOG_DESCRIPTION),
    meta: [
      ...buildWebsiteHead(BLOG_TITLE, BLOG_DESCRIPTION).meta,
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pl_PL' },
    ],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=3600',
  }),
  component: BlogPage,
})

function BlogPage() {
  const { posts } = Route.useLoaderData()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <BlogListPage posts={posts} />
    </>
  )
}
