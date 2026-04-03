'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@agency/ui'
import { messages } from '@/lib/messages'

interface DeletePostDialogProps {
  postTitle: string
  deleteState: 'idle' | 'deleting'
  onDelete: () => void
}

export function DeletePostDialog({ postTitle, deleteState, onDelete }: DeletePostDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          disabled={deleteState === 'deleting'}
        >
          {deleteState === 'deleting' ? messages.blog.deleting : messages.blog.deletePost}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.blog.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {messages.blog.deleteConfirmDescription(postTitle)}
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
  )
}
