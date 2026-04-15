

import { Button } from '@agency/ui'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { messages } from '@/lib/messages'

interface CoverImageUploadProps {
  preview: string | null
  modalOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
  onRemove: () => void
  coverEditorProxy: any
}

export function CoverImageUpload({
  preview,
  modalOpen,
  onOpenModal,
  onCloseModal,
  onRemove,
  coverEditorProxy,
}: CoverImageUploadProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{messages.blog.coverImageLabel}</span>

      {preview ? (
        <div className="group relative overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={messages.blog.coverImagePreviewAlt}
            className="aspect-video w-full rounded-lg object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-background/90 text-xs"
              onClick={onOpenModal}
            >
              {messages.common.change}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-background/90 text-xs text-destructive"
              onClick={onRemove}
            >
              {messages.common.delete}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-8 transition-colors hover:border-primary/40 hover:bg-muted/60"
          onClick={onOpenModal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenModal()
          }}
          aria-label={messages.blog.dragOrClickAria}
        >
          <svg
            className="h-8 w-8 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="text-xs text-muted-foreground">
            {messages.blog.dragOrClick}
          </p>
        </div>
      )}

      <InsertMediaModal
        editor={coverEditorProxy as never}
        open={modalOpen}
        onClose={onCloseModal}
      />
    </div>
  )
}
