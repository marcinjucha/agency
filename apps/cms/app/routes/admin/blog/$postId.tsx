import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getBlogPostFn, getCategoriesFn } from '@/features/blog/server'
import { queryKeys } from '@/lib/query-keys'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/admin/blog/$postId')({
  head: () => buildCmsHead(messages.blog.editPost),
  loader: ({ params, context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.blog.detail(params.postId),
      queryFn: () => getBlogPostFn({ data: { id: params.postId } }),
    })
    queryClient.prefetchQuery({
      queryKey: queryKeys.blog.categories,
      queryFn: () => getCategoriesFn(),
    })
  },
  component: BlogPostEditorPage,
})

function BlogPostEditorPage() {
  const { postId } = Route.useParams()
  const { data: blogPost } = useQuery({
    queryKey: queryKeys.blog.detail(postId),
    queryFn: () => getBlogPostFn({ data: { id: postId } }),
  })

  return <BlogPostEditor blogPost={blogPost ?? undefined} />
}
