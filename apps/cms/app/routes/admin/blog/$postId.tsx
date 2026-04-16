import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  createBlogPostFn,
  updateBlogPostFn,
  deleteBlogPostFn,
} from '@/features/blog/server'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'
import type { BlogPostPayload, SaveBlogPostResult } from '@/features/blog/components/BlogPostEditor'
import type { BlogPost } from '@/features/blog/types'
import { useQuery } from '@tanstack/react-query'
import { getBlogPost, getBlogCategories } from '@/features/blog/queries'
import { LoadingState, ErrorState } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'

export const Route = createFileRoute('/admin/blog/$postId')({
  head: () => buildCmsHead(messages.blog.editPost),
  component: BlogPostEditorPage,
})

function BlogPostEditorPage() {
  const { postId } = Route.useParams()
  const { data: blogPost, isLoading, error } = useQuery<BlogPost>({
    queryKey: queryKeys.blog.detail(postId),
    queryFn: () => getBlogPost(postId),
  })

  if (isLoading) return <LoadingState variant="skeleton-card" rows={4} />
  if (error) return <ErrorState message={error.message} />

  return (
    <BlogPostEditor
      blogPost={blogPost ?? undefined}
      createFn={(data: BlogPostPayload) =>
        createBlogPostFn({ data }) as Promise<SaveBlogPostResult>
      }
      updateFn={(id: string, data: BlogPostPayload) =>
        updateBlogPostFn({ data: { id, data } }) as Promise<SaveBlogPostResult>
      }
      deleteFn={(id: string) =>
        deleteBlogPostFn({ data: { id } }) as Promise<{ success: boolean; error?: string }>
      }
    />
  )
}
