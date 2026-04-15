

import { Button } from '@agency/ui'
import { useRouter } from 'next/navigation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { BlogPostStatus, SaveState } from '../types'

interface BlogEditorTopBarProps {
  isEditing: boolean
  currentStatus: BlogPostStatus
  saveState: SaveState
  errorMessage: string | null
  watchPublishedAt: string | null | undefined
  onSaveDraft: () => void
  onSave: () => void
  onSchedulePublish: () => void
  onPublishNow: () => void
}

export function BlogEditorTopBar({
  isEditing,
  currentStatus,
  saveState,
  errorMessage,
  watchPublishedAt,
  onSaveDraft,
  onSave,
  onSchedulePublish,
  onPublishNow,
}: BlogEditorTopBarProps) {
  const router = useRouter()

  const saveLabel: Record<SaveState, string> = {
    idle: isEditing ? messages.common.save : messages.blog.saveDraft,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => router.push(routes.admin.blog)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 w-fit"
            >
              <span aria-hidden="true">&larr;</span>
              {messages.blog.backToList}
            </button>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? messages.blog.editPost : messages.blog.newPost}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Unpublish — shown for scheduled and published */}
            {isEditing && currentStatus !== 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={saveState === 'saving'}
              >
                {messages.common.unpublish}
              </Button>
            )}

            {currentStatus === 'published' ? (
              <Button
                size="sm"
                onClick={onSave}
                disabled={saveState === 'saving'}
              >
                {saveLabel[saveState]}
              </Button>
            ) : currentStatus === 'scheduled' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                <Button size="sm" onClick={onPublishNow} disabled={saveState === 'saving'}>
                  {messages.blog.publishNow}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveDraft}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                {watchPublishedAt && new Date(watchPublishedAt) > new Date() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSchedulePublish}
                    disabled={saveState === 'saving'}
                  >
                    {messages.blog.schedulePublish}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onPublishNow}
                  disabled={saveState === 'saving'}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {messages.blog.publishNow}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="w-full px-4 pt-3 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        </div>
      )}
    </>
  )
}
