import { createFileRoute } from '@tanstack/react-router'
import { getPublishedBlogPostsFn } from '@/features/blog/server'
import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { buildWebsiteHead } from '@/lib/head'
import { queryKeys } from '@/lib/query-keys'
import { CACHE_BLOG } from '@/lib/cache-headers'

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
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.blog.all,
      queryFn: () => getPublishedBlogPostsFn(),
    }),
  head: () => ({
    ...buildWebsiteHead(BLOG_TITLE, BLOG_DESCRIPTION),
    meta: [
      ...buildWebsiteHead(BLOG_TITLE, BLOG_DESCRIPTION).meta,
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pl_PL' },
    ],
  }),
  headers: () => CACHE_BLOG,
  pendingComponent: BlogListSkeleton,
  component: BlogPage,
})

function BlogListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden pb-16 pt-28 md:pb-20 md:pt-36">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="max-w-3xl space-y-3">
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="mt-6 max-w-2xl space-y-2">
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* Category filter bar skeleton */}
        <div className="mb-12 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-full bg-muted"
              style={{ width: `${64 + i * 16}px` }}
            />
          ))}
        </div>

        <div className="space-y-12">
          {/* Featured post skeleton */}
          <div className="overflow-hidden rounded-2xl bg-muted/40">
            <div className="grid md:grid-cols-[1.2fr_1fr]">
              <div className="aspect-[16/9] animate-pulse bg-muted md:aspect-[4/3]" />
              <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
                  <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Grid of card skeletons */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-xl bg-muted/30"
              >
                <div className="aspect-[16/9] animate-pulse bg-muted" />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="mb-2 space-y-2">
                    <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="mb-4 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BlogPage() {
  // ensureQueryData in loader guarantees data is in cache — useLoaderData() is safe here.
  // WHY: website is not CMS, useQuery is CMS-only (memory.md architecture decision).
  const posts = Route.useLoaderData() ?? []

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
