import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedBlogPostFn } from '@/features/blog/server'
import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'
import { buildArticleJsonLd } from '@/features/blog/utils'
import { buildWebsiteHead } from '@/lib/head'
import { queryKeys } from '@/lib/query-keys'
import { CACHE_BLOG } from '@/lib/cache-headers'
import type { SeoMetadata } from '@/features/blog/types'

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    const post = await queryClient.ensureQueryData({
      queryKey: queryKeys.blog.detail(params.slug),
      queryFn: () => getPublishedBlogPostFn({ data: { slug: params.slug } }),
    })
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
    const keywords = seo?.keywords?.length ? seo.keywords : undefined

    return {
      ...buildWebsiteHead(title, description, ogImage, keywords, `/blog/${post.slug}`),
      meta: [
        ...buildWebsiteHead(title, description, ogImage, keywords).meta,
        { property: 'og:type', content: 'article' },
        { property: 'og:locale', content: 'pl_PL' },
        ...(post.published_at ? [{ property: 'article:published_time', content: post.published_at }] : []),
        ...(post.author_name ? [{ property: 'article:author', content: post.author_name }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    }
  },
  headers: () => CACHE_BLOG,
  pendingComponent: BlogArticleSkeleton,
  component: BlogPostPage,
})

function BlogArticleSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <article className="pb-16 pt-24 md:pt-32">
        {/* Header skeleton */}
        <header className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Category badge */}
          <div className="mb-6 h-6 w-20 animate-pulse rounded-full bg-muted" />

          {/* Title — 2 lines */}
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted sm:h-12" />
            <div className="h-10 w-3/5 animate-pulse rounded-lg bg-muted sm:h-12" />
          </div>

          {/* Author + date meta */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </header>

        {/* Cover image skeleton */}
        <div className="mx-auto mt-10 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="h-[300px] animate-pulse overflow-hidden rounded-2xl bg-muted sm:h-[400px] md:h-[500px]" />
        </div>

        {/* Content skeleton — paragraph lines */}
        <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Paragraph 1 */}
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>

            {/* Subheading */}
            <div className="h-7 w-2/5 animate-pulse rounded-lg bg-muted" />

            {/* Paragraph 2 */}
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>

            {/* Subheading */}
            <div className="h-7 w-1/3 animate-pulse rounded-lg bg-muted" />

            {/* Paragraph 3 */}
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

function BlogPostPage() {
  // ensureQueryData in loader guarantees post is in cache — useLoaderData() is safe here.
  // WHY: website is not CMS, useQuery is CMS-only (memory.md architecture decision).
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
