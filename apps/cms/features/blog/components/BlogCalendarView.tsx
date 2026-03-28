'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar } from '@agency/ui'
import { pl } from 'date-fns/locale'
import { format, isSameDay, startOfDay } from 'date-fns'
import { CalendarDays, FileText, Clock, User } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { BlogPostListItem } from '../types'
import { getPostStatus, type BlogPostStatus } from '../types'
import { BlogStatusBadge } from './blog-status-badge'

interface BlogCalendarViewProps {
  posts: BlogPostListItem[]
}

/** Returns the date used to place a post on the calendar. */
function getCalendarDate(post: BlogPostListItem): Date {
  if (post.is_published && post.published_at) {
    return startOfDay(new Date(post.published_at))
  }
  return startOfDay(new Date(post.created_at))
}

type EnrichedPost = BlogPostListItem & { status: BlogPostStatus }

export function BlogCalendarView({ posts }: BlogCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date()
  )

  /** Map from day timestamp to posts on that day. */
  const postsByDay = useMemo(() => {
    const map = new Map<number, EnrichedPost[]>()
    for (const post of posts) {
      const day = getCalendarDate(post).getTime()
      const enriched: EnrichedPost = {
        ...post,
        status: getPostStatus(post.is_published, post.published_at),
      }
      const existing = map.get(day) ?? []
      existing.push(enriched)
      map.set(day, existing)
    }
    return map
  }, [posts])

  /** Dates that have posts -- used as calendar modifier. */
  const datesWithPosts = useMemo(
    () => Array.from(postsByDay.keys()).map((ts) => new Date(ts)),
    [postsByDay]
  )

  /** Posts on the selected date. */
  const postsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    const key = startOfDay(selectedDate).getTime()
    return postsByDay.get(key) ?? []
  }, [selectedDate, postsByDay])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Tailwind cannot express ::after pseudo-elements with dynamic content -- inline CSS required for calendar day dot indicators */}
      <style>{`
        .has-post-indicator button {
          position: relative;
        }
        .has-post-indicator button::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: var(--color-primary);
        }
      `}</style>

      {/* Calendar panel */}
      <div className="shrink-0 lg:sticky lg:top-4 lg:self-start rounded-lg border border-border bg-card p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={pl}
          modifiers={{ hasPost: datesWithPosts }}
          modifiersClassNames={{ hasPost: 'has-post-indicator' }}
        />
      </div>

      {/* Selected day detail panel */}
      <div className="min-w-0 flex-1">
        {selectedDate ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {messages.blog.postsOnDate(postsOnSelectedDate.length)}
              </span>
            </div>

            {postsOnSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {messages.blog.noScheduledPosts}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {postsOnSelectedDate.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Wybierz dzien w kalendarzu
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PostCard({ post }: { post: EnrichedPost }) {
  const dateStr = post.published_at
    ? format(new Date(post.published_at), 'd MMM yyyy, HH:mm', { locale: pl })
    : format(new Date(post.created_at), 'd MMM yyyy, HH:mm', { locale: pl })

  return (
    <Link
      href={routes.admin.blogPost(post.id)}
      className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      {/* Thumbnail */}
      {post.cover_image_url ? (
        <div className="hidden sm:block h-20 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="hidden sm:flex h-20 w-32 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {post.title}
          </h4>
          <BlogStatusBadge status={post.status} />
        </div>

        {post.excerpt && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {dateStr}
          </span>
          {post.author_name && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {post.author_name}
            </span>
          )}
          {post.estimated_reading_time && (
            <span className="text-xs text-muted-foreground">
              {post.estimated_reading_time} min
            </span>
          )}
          {post.category && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {post.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
