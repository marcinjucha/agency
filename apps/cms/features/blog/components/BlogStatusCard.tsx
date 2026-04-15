

import { Button, Card, CardContent, CardHeader, CardTitle, DatePicker, TimePicker } from '@agency/ui'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { startOfDay } from 'date-fns'
import { messages } from '@/lib/messages'
import { BlogStatusBadge } from './blog-status-badge'
import type { BlogPost } from '../types'
import type { BlogPostStatus } from '../types'

interface BlogStatusCardProps {
  currentStatus: BlogPostStatus
  scheduledDate: Date | undefined
  scheduledTime: string
  watchPublishedAt: string | null | undefined
  readingTime: number
  blogPost: BlogPost | undefined
  onDateSelect: (date: Date | undefined) => void
  onTimeChange: (time: string) => void
  onClearSchedule: () => void
  onCopyPreviewLink: () => void
}

export function BlogStatusCard({
  currentStatus,
  scheduledDate,
  scheduledTime,
  watchPublishedAt,
  readingTime,
  blogPost,
  onDateSelect,
  onTimeChange,
  onClearSchedule,
  onCopyPreviewLink,
}: BlogStatusCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">
          {messages.blog.statusTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{messages.blog.statusTitle}</span>
          <BlogStatusBadge status={currentStatus} />
        </div>

        {/* Schedule date/time picker — visible for draft + scheduled, hidden for published */}
        {currentStatus !== 'published' && (
          <div className="space-y-2">
            <DatePicker
              value={scheduledDate}
              onChange={onDateSelect}
              disabled={(date) => date < startOfDay(new Date())}
              placeholder={messages.blog.pickDate}
            />

            <div className="flex items-center gap-2">
              <TimePicker
                value={scheduledTime}
                onChange={(time) => onTimeChange(time ?? '09:00')}
                minuteStep={5}
              />
              {scheduledDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSchedule}
                  className="text-xs text-muted-foreground"
                >
                  {messages.blog.removeSchedule}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Scheduled date display for scheduled status */}
        {currentStatus === 'scheduled' && watchPublishedAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {messages.blog.scheduledFor}
            </span>
            <span className="text-xs">
              {format(new Date(watchPublishedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
            </span>
          </div>
        )}

        {/* Published date display */}
        {currentStatus === 'published' && blogPost?.published_at && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {messages.blog.publishDate}
            </span>
            <span className="text-xs">
              {new Date(blogPost.published_at).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{messages.blog.readingTime}</span>
          <span className="text-xs">{readingTime} min</span>
        </div>

        {blogPost?.preview_token && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {messages.blog.previewLink}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={onCopyPreviewLink}
            >
              {messages.common.copyLink}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
