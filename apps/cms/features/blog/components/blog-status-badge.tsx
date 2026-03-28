import { Badge } from '@agency/ui'
import type { BlogPostStatus } from '../types'
import { messages } from '@/lib/messages'

export function BlogStatusBadge({ status }: { status: BlogPostStatus }) {
  if (status === 'published') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
        {messages.common.published}
      </Badge>
    )
  }
  if (status === 'scheduled') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20">
        {messages.blog.scheduled}
      </Badge>
    )
  }
  return <Badge variant="secondary">{messages.common.draft}</Badge>
}
