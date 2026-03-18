import { notFound } from 'next/navigation'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'
import { getBlogPostServer } from '@/features/blog/queries.server'

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const blogPost = await getBlogPostServer(id)

  if (!blogPost) {
    notFound()
  }

  return <BlogPostEditor blogPost={blogPost} />
}
