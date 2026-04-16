import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { BlogPostList } from '@/features/blog/components/BlogPostList'
import { getBlogPosts } from '@/features/blog/queries'

export const Route = createFileRoute('/admin/blog/')({
  head: () => buildCmsHead(messages.nav.blog),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.blog.list,
      queryFn: () => getBlogPosts(),
    })
  },
  component: BlogListPage,
})

function BlogListPage() {
  return <BlogPostList />
}
