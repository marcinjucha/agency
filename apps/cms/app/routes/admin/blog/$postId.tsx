import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  getBlogPostFn,
  getCategoriesFn,
  createBlogPostFn,
  updateBlogPostFn,
  deleteBlogPostFn,
} from '@/features/blog/server'
import { queryKeys } from '@/lib/query-keys'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'
import type { BlogPostPayload, SaveBlogPostResult } from '@/features/blog/components/BlogPostEditor'
import type { BlogPost } from '@/features/blog/types'
import { useQuery } from '@tanstack/react-query'
import { getBlogPost } from '@/features/blog/queries'

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
  const { data: blogPost } = useQuery<BlogPost>({
    queryKey: queryKeys.blog.detail(postId),
    queryFn: () => getBlogPost(postId),
  })

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
