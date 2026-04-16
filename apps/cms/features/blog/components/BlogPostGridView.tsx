

import { useNavigate } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import {
  Card,
  Button,
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
import { Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { BlogStatusBadge } from './blog-status-badge'
import { getPostStatus } from '../types'
import type { BlogPostListItem } from '../types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function formatDisplayDate(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    const now = new Date()
    if (now.getTime() - date.getTime() < SEVEN_DAYS_MS) {
      return formatDistanceToNow(date, { addSuffix: true, locale: pl })
    }
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function getDisplayDate(post: BlogPostListItem): string | null {
  if (post.is_published && post.published_at) return post.published_at
  return post.created_at
}

interface BlogPostGridViewProps {
  posts: BlogPostListItem[]
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function BlogPostGridView({ posts, onDelete, isDeleting }: BlogPostGridViewProps) {
  const navigate = useNavigate()

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {messages.blog.noPostsYet}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {posts.map((post) => {
        const status = getPostStatus(post.is_published, post.published_at)
        return (
          <Card
            key={post.id}
            className="group cursor-pointer bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring"
            role="button"
            tabIndex={0}
            onClick={() => navigate({ to: routes.admin.blogPost(post.id) })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate({ to: routes.admin.blogPost(post.id) })
              }
            }}
          >
            {/* Cover image — aspect-[16/7], full card width */}
            <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
              {post.cover_image_url ? (
                <Image
                  src={post.cover_image_url}
                  alt=""
                  layout="fullWidth"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                  <span className="text-2xl font-semibold text-muted-foreground/20">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Text below image */}
            <div className="p-2.5">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{post.title}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BlogStatusBadge status={status} />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDisplayDate(getDisplayDate(post))}
                  </span>
                </div>

                {/* Delete button */}
                <div
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      aria-label={messages.blog.deletePost}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{messages.blog.deletePostConfirmTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {messages.blog.deletePostConfirmDescription(post.title)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {messages.common.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
