

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlogPosts, blogKeys } from '../queries'
import { deleteBlogPost } from '../actions'
import {
  Button,
  Skeleton,
  LoadingState,
  ErrorState,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Link } from '@tanstack/react-router'
import { FileText, Plus } from 'lucide-react'
import { startOfDay, isSameDay } from 'date-fns'
import { getPostStatus } from '../types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { useViewMode } from '@/hooks/use-view-mode'
import { useSortMode } from '@/hooks/use-sort-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'
import { BlogPostListView } from './BlogPostListView'
import { BlogPostGridView } from './BlogPostGridView'
import { BlogCalendarView } from './BlogCalendarView'
import type { BlogPostListItem } from '../types'

/** Returns the date used to place a post on the calendar. */
function getCalendarDate(post: BlogPostListItem): Date {
  if (post.is_published && post.published_at) {
    return startOfDay(new Date(post.published_at))
  }
  return startOfDay(new Date(post.created_at))
}

export function BlogPostList() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [viewMode, setViewMode] = useViewMode('blog-view-mode', 'grid')
  const [sortMode, setSortMode] = useSortMode('blog-sort-mode', 'newest')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  /** Toggle date selection — clicking the same date deselects it. */
  const handleSelectDate = useCallback(
    (date: Date | undefined) => {
      if (date && selectedDate && isSameDay(date, selectedDate)) {
        setSelectedDate(undefined)
      } else {
        setSelectedDate(date)
      }
    },
    [selectedDate]
  )

  /** Filter posts by selected date and status, then sort. */
  const filteredPosts = useMemo(() => {
    if (!posts) return []
    const dateFiltered = selectedDate
      ? posts.filter((post) => isSameDay(getCalendarDate(post), selectedDate))
      : posts

    const statusFiltered =
      statusFilter === 'all'
        ? dateFiltered
        : dateFiltered.filter(
            (post) => getPostStatus(post.is_published, post.published_at) === statusFilter
          )

    return [...statusFiltered].sort((a, b) => {
      switch (sortMode) {
        case 'newest':
          return new Date(b.published_at ?? b.created_at).getTime()
            - new Date(a.published_at ?? a.created_at).getTime()
        case 'oldest':
          return new Date(a.published_at ?? a.created_at).getTime()
            - new Date(b.published_at ?? b.created_at).getTime()
        case 'title-az':
          return (a.title ?? '').localeCompare(b.title ?? '', 'pl')
        case 'title-za':
          return (b.title ?? '').localeCompare(a.title ?? '', 'pl')
        default:
          return 0
      }
    })
  }, [posts, selectedDate, sortMode, statusFilter])

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
          <Link to={routes.admin.blogNew}>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.blog.blog}</h1>
        <div className="flex items-center gap-3">
          <Link to={routes.admin.blogNew}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {messages.blog.newPostButton}
            </Button>
          </Link>
        </div>
      </div>

      {/* Unified layout: calendar + content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar panel — always visible */}
        <div className="shrink-0">
          <BlogCalendarView
            posts={posts}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </div>

        {/* Right panel: toggle + view */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Toolbar: status filter + sort + view toggle */}
          <div className="flex items-center justify-end gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44" aria-label={messages.blog.filter.statusLabel}>
                <SelectValue placeholder={messages.blog.filter.statusLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{messages.blog.filter.allStatuses}</SelectItem>
                <SelectItem value="published">{messages.blog.filter.published}</SelectItem>
                <SelectItem value="draft">{messages.blog.filter.draft}</SelectItem>
                <SelectItem value="scheduled">{messages.blog.filter.scheduled}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
              <SelectTrigger className="h-9 w-40" aria-label={messages.blog.sort.label}>
                <SelectValue placeholder={messages.blog.sort.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{messages.blog.sort.newest}</SelectItem>
                <SelectItem value="oldest">{messages.blog.sort.oldest}</SelectItem>
                <SelectItem value="title-az">{messages.blog.sort.titleAZ}</SelectItem>
                <SelectItem value="title-za">{messages.blog.sort.titleZA}</SelectItem>
              </SelectContent>
            </Select>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'grid' ? (
            <BlogPostGridView
              posts={filteredPosts}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          ) : (
            <BlogPostListView
              posts={filteredPosts}
              totalCount={posts.length}
              selectedDate={selectedDate}
              onClearDate={() => setSelectedDate(undefined)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
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
