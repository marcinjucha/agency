'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlogPosts, blogKeys } from '../queries'
import { deleteBlogPost } from '../actions'
import {
  Button,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@agency/ui'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { BlogPostListView } from './BlogPostListView'
import { BlogCalendarView } from './BlogCalendarView'

export function BlogPostList() {
  const queryClient = useQueryClient()

  const {
    data: posts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: blogKeys.list,
    queryFn: getBlogPosts,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBlogPost(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })

  if (isLoading) return <BlogPostListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.blog.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={messages.blog.noPostsYet}
        description={messages.blog.noPostsDescription}
        variant="card"
        action={
          <Link href={routes.admin.blogNew}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {messages.blog.writeFirstPost}
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <Tabs defaultValue="list" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.blog.blog}</h1>
        <div className="flex items-center gap-3">
          <TabsList>
            <TabsTrigger value="list">{messages.blog.listView}</TabsTrigger>
            <TabsTrigger value="calendar">{messages.blog.calendarView}</TabsTrigger>
          </TabsList>
          <Link href={routes.admin.blogNew}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {messages.blog.newPostButton}
            </Button>
          </Link>
        </div>
      </div>

      <TabsContent value="list">
        <BlogPostListView
          posts={posts}
          onDelete={(id) => deleteMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
        />
      </TabsContent>
      <TabsContent value="calendar">
        <BlogCalendarView posts={posts} />
      </TabsContent>
    </Tabs>
  )
}

// --- Skeleton ---

function BlogPostListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* Row skeletons */}
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="hidden sm:block h-10 w-10 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="hidden md:block h-5 w-20 rounded-full" />
            <Skeleton className="hidden sm:block h-3 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}
