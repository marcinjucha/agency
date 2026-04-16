import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getCategoriesFn } from '@/features/blog/server'
import { queryKeys } from '@/lib/query-keys'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'

export const Route = createFileRoute('/admin/blog/new')({
  head: () => buildCmsHead(messages.blog.newPost),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.blog.categories,
      queryFn: () => getCategoriesFn(),
    })
  },
  component: NewBlogPostPage,
})

function NewBlogPostPage() {
  return <BlogPostEditor />
}
