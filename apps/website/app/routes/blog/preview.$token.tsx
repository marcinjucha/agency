import { createFileRoute, notFound } from '@tanstack/react-router'
import { getBlogPostByPreviewTokenFn } from '@/features/blog/server'
import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'

export const Route = createFileRoute('/blog/preview/$token')({
  loader: async ({ params }) => {
    const post = await getBlogPostByPreviewTokenFn({ data: { token: params.token } })
    if (!post) throw notFound()
    return { post }
  },
  head: () => ({
    meta: [
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  // No cache headers — preview is always dynamic (bypasses is_published filter)
  component: BlogPreviewPage,
})

function BlogPreviewPage() {
  const { post } = Route.useLoaderData()

  return <BlogArticlePage post={post} isPreview />
}
