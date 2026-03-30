import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Create folder ---

export const createFolderSchema = z.object({
  name: z.string().min(1, messages.media.folderNameRequired),
  parent_id: z.string().uuid().nullable().optional(),
})

// --- Rename folder ---

export const renameFolderSchema = z.object({
  name: z.string().min(1, messages.media.folderNameRequired),
})

// --- Move item to folder (null = root/unsorted) ---

export const moveToFolderSchema = z.object({
  folder_id: z.string().uuid().nullable(),
})

// --- Inferred types ---

export type CreateFolderFormData = z.infer<typeof createFolderSchema>
export type RenameFolderFormData = z.infer<typeof renameFolderSchema>
export type MoveToFolderFormData = z.infer<typeof moveToFolderSchema>
