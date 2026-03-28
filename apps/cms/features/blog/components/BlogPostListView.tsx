'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import { useRouter } from 'next/navigation'
import { Trash2, ArrowUpDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { BlogPostListItem } from '../types'
import { getPostStatus, type BlogPostStatus } from '../types'
import { BlogStatusBadge } from './blog-status-badge'

interface BlogPostListViewProps {
  posts: BlogPostListItem[]
  onDelete: (id: string) => void
  isDeleting: boolean
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    const now = new Date()
    if (now.getTime() - date.getTime() < SEVEN_DAYS_MS) {
      return formatDistanceToNow(date, { addSuffix: true, locale: pl })
    }
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getDisplayDate(post: BlogPostListItem): string | null {
  if (post.is_published && post.published_at) return post.published_at
  return post.created_at
}

export function BlogPostListView({
  posts,
  onDelete,
  isDeleting,
}: BlogPostListViewProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortNewest, setSortNewest] = useState(true)

  const filteredAndSorted = useMemo(() => {
    let result = posts.map((post) => ({
      ...post,
      status: getPostStatus(post.is_published, post.published_at),
    }))

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }

    result.sort((a, b) => {
      const dateA = new Date(getDisplayDate(a) ?? a.created_at).getTime()
      const dateB = new Date(getDisplayDate(b) ?? b.created_at).getTime()
      return sortNewest ? dateB - dateA : dateA - dateB
    })

    return result
  }, [posts, statusFilter, sortNewest])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={messages.blog.allStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.blog.allStatuses}</SelectItem>
            <SelectItem value="draft">{messages.common.draft}</SelectItem>
            <SelectItem value="scheduled">{messages.blog.scheduled}</SelectItem>
            <SelectItem value="published">
              {messages.common.published}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortNewest((prev) => !prev)}
          className="gap-2 text-muted-foreground"
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          {sortNewest ? messages.blog.sortNewest : messages.blog.sortOldest}
        </Button>
      </div>

      {/* List */}
      <div className="divide-y divide-border rounded-lg border border-border">
        {filteredAndSorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {messages.blog.noPostsYet}
          </div>
        ) : (
          filteredAndSorted.map((post) => (
            <BlogPostRow
              key={post.id}
              post={post}
              status={post.status}
              onNavigate={() => router.push(routes.admin.blogPost(post.id))}
              onDelete={() => onDelete(post.id)}
              isDeleting={isDeleting}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      <p className="text-xs text-muted-foreground">
        {messages.blog.postsCount(
          filteredAndSorted.length,
          posts.length,
          messages.blog.postsLabel(posts.length)
        )}
      </p>
    </div>
  )
}

// --- Row ---

function BlogPostRow({
  post,
  status,
  onNavigate,
  onDelete,
  isDeleting,
}: {
  post: BlogPostListItem
  status: BlogPostStatus
  onNavigate: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNavigate()
        }
      }}
    >
      {/* Thumbnail */}
      <div className="hidden sm:block h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40 text-xs font-medium">
            B
          </div>
        )}
      </div>

      {/* Title + excerpt */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {post.title}
        </p>
        {post.excerpt && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {post.excerpt}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="hidden md:block flex-shrink-0">
        <BlogStatusBadge status={status} />
      </div>

      {/* Category */}
      {post.category && (
        <div className="hidden lg:block flex-shrink-0">
          <Badge variant="outline" className="text-xs">
            {post.category}
          </Badge>
        </div>
      )}

      {/* Date */}
      <div className="hidden sm:block flex-shrink-0 text-xs text-muted-foreground w-28 text-right">
        {formatDate(getDisplayDate(post))}
      </div>

      {/* Author */}
      {post.author_name && (
        <div className="hidden lg:block flex-shrink-0 text-xs text-muted-foreground w-24 truncate text-right">
          {post.author_name}
        </div>
      )}

      {/* Delete */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
              aria-label={messages.blog.deletePost}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {messages.blog.deletePostConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {messages.blog.deletePostConfirmDescription(post.title)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
