import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  getCategoriesFn,
  createBlogPostFn,
  updateBlogPostFn,
  deleteBlogPostFn,
} from '@/features/blog/server'
import { queryKeys } from '@/lib/query-keys'
import { BlogPostEditor } from '@/features/blog/components/BlogPostEditor'
import type { BlogPostPayload, SaveBlogPostResult } from '@/features/blog/components/BlogPostEditor'

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
  return (
    <BlogPostEditor
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
