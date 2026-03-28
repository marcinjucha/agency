'use client'

import { useMemo } from 'react'
import { Calendar } from '@agency/ui'
import { pl } from 'date-fns/locale'
import { startOfDay } from 'date-fns'
import type { BlogPostListItem } from '../types'

interface BlogCalendarViewProps {
  posts: BlogPostListItem[]
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
}

/** Returns the date used to place a post on the calendar. */
function getCalendarDate(post: BlogPostListItem): Date {
  if (post.is_published && post.published_at) {
    return startOfDay(new Date(post.published_at))
  }
  return startOfDay(new Date(post.created_at))
}

export function BlogCalendarView({
  posts,
  selectedDate,
  onSelectDate,
}: BlogCalendarViewProps) {
  /** Dates that have posts -- used as calendar modifier for dot indicators. */
  const datesWithPosts = useMemo(() => {
    const seen = new Set<number>()
    const dates: Date[] = []
    for (const post of posts) {
      const ts = getCalendarDate(post).getTime()
      if (!seen.has(ts)) {
        seen.add(ts)
        dates.push(new Date(ts))
      }
    }
    return dates
  }, [posts])

  return (
    <div className="lg:sticky lg:top-4 lg:self-start rounded-lg border border-border bg-card p-4">
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

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        locale={pl}
        modifiers={{ hasPost: datesWithPosts }}
        modifiersClassNames={{ hasPost: 'has-post-indicator' }}
      />
    </div>
  )
}
