'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@agency/ui'
import { createFolderSchema, renameFolderSchema } from '../folder-validation'
import type { CreateFolderFormData, RenameFolderFormData } from '../folder-validation'
import { createFolder, renameFolder } from '../folder-actions'
import { folderKeys } from '../folder-queries'
import type { MediaFolder } from '../folder-types'
import { messages } from '@/lib/messages'

type FolderCreateDialogProps = {
  open: boolean
  onClose: () => void
  parentId?: string
  existingFolder?: MediaFolder
}

export function FolderCreateDialog({
  open,
  onClose,
  parentId,
  existingFolder,
}: FolderCreateDialogProps) {
  const queryClient = useQueryClient()
  const isRename = !!existingFolder

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFolderFormData | RenameFolderFormData>({
    resolver: zodResolver(isRename ? renameFolderSchema : createFolderSchema),
    defaultValues: {
      name: existingFolder?.name ?? '',
    },
  })

  // Reset form when dialog opens/closes or folder changes
  useEffect(() => {
    if (open) {
      reset({ name: existingFolder?.name ?? '' })
    }
  }, [open, existingFolder, reset])

  const createMutation = useMutation({
    mutationFn: async (data: CreateFolderFormData) => {
      const result = await createFolder({ ...data, parent_id: parentId ?? null })
      if (!result.success) throw new Error(result.error ?? messages.media.createFolderFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
      onClose()
    },
  })

  const renameMutation = useMutation({
    mutationFn: async (data: RenameFolderFormData) => {
      if (!existingFolder) return
      const result = await renameFolder(existingFolder.id, data)
      if (!result.success) throw new Error(result.error ?? messages.media.renameFolderFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
      onClose()
    },
  })

  const isPending = createMutation.isPending || renameMutation.isPending
  const mutationError = createMutation.error || renameMutation.error

  function onSubmit(data: CreateFolderFormData | RenameFolderFormData) {
    if (isRename) {
      renameMutation.mutate(data as RenameFolderFormData)
    } else {
      createMutation.mutate(data as CreateFolderFormData)
    }
  }

  const title = isRename ? messages.media.renameFolder : messages.media.createFolder

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {isRename ? 'Zmien nazwe istniejacego folderu' : 'Utworz nowy folder w bibliotece mediow'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Nazwa</Label>
            <Input
              id="folder-name"
              {...register('name')}
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'folder-name-error' : undefined}
            />
            {errors.name && (
              <p id="folder-name-error" className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {mutationError && (
            <p className="text-xs text-destructive" role="alert">
              {mutationError instanceof Error ? mutationError.message : messages.media.unknownError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? messages.common.saving : messages.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
