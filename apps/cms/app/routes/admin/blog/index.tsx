import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { BlogPostList } from '@/features/blog/components/BlogPostList'

export const Route = createFileRoute('/admin/blog/')({
  head: () => buildCmsHead(messages.nav.blog),
  component: BlogListPage,
})

function BlogListPage() {
  return <BlogPostList />
}
