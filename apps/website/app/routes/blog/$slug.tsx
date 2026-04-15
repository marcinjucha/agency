import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedBlogPostFn } from '@/features/blog/server'
import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'
import { buildArticleJsonLd } from '@/features/blog/utils'
import { buildWebsiteHead } from '@/lib/head'
import type { SeoMetadata } from '@/features/blog/types'

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const post = await getPublishedBlogPostFn({ data: { slug: params.slug } })
    if (!post) throw notFound()
    return { post }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.post) return { meta: [{ title: 'Nie znaleziono artykułu | Halo Efekt' }] }

    const { post } = loaderData
    const seo = post.seo_metadata as SeoMetadata | null
    const title = seo?.title || post.title
    const description = seo?.description || post.excerpt || undefined
    const ogImage = seo?.ogImage || post.cover_image_url || undefined

    return {
      ...buildWebsiteHead(title, description, ogImage),
      meta: [
        ...buildWebsiteHead(title, description, ogImage).meta,
        { property: 'og:type', content: 'article' },
        { property: 'og:locale', content: 'pl_PL' },
        ...(post.published_at ? [{ property: 'article:published_time', content: post.published_at }] : []),
        ...(post.author_name ? [{ property: 'article:author', content: post.author_name }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=3600',
  }),
  component: BlogPostPage,
})

function BlogPostPage() {
  const { post } = Route.useLoaderData()
  const jsonLd = buildArticleJsonLd(post)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticlePage post={post} />
    </>
  )
}
