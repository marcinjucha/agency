import { z } from 'zod'
import { messages } from '@/lib/messages'
import { MEDIA_TYPES, type MediaType } from './types'

// MEDIA_TYPES is `as const`; Object.values returns a readonly tuple.
// z.enum requires a non-empty mutable tuple, so cast accordingly.
// Single source of truth — adding a MediaType in types.ts auto-extends this enum.
const mediaTypeValues = Object.values(MEDIA_TYPES) as [MediaType, ...MediaType[]]

// --- YouTube URL pattern ---

export const youtubeUrlSchema = z
  .string()
  .regex(
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/,
    messages.validation.invalidYouTubeUrl
  )

// --- Vimeo URL pattern ---

export const vimeoUrlSchema = z
  .string()
  .regex(
    /^https?:\/\/(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/,
    messages.validation.invalidVimeoUrl
  )

// --- Create media item (upload flow: all fields required, embed flow: s3_key optional) ---

export const createMediaItemSchema = z.object({
  name: z.string().min(1, messages.validation.nameRequired),
  type: z.enum(mediaTypeValues, {
    required_error: messages.validation.typeRequired,
  }),
  url: z.string().url(messages.validation.invalidUrl),
  s3_key: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  size_bytes: z.number().int().positive().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  // No .default(false) — keeps the field optional in CreateMediaItemFormData so
  // call sites can omit it. server.ts insertMediaItem applies the `?? false` fallback.
  is_downloadable: z.boolean().optional(),
})

// --- Update media item (rename only) ---

export const updateMediaItemSchema = z.object({
  name: z.string().min(1, messages.validation.nameRequired),
})

// --- Inferred types ---

export type CreateMediaItemFormData = z.infer<typeof createMediaItemSchema>
export type UpdateMediaItemFormData = z.infer<typeof updateMediaItemSchema>
