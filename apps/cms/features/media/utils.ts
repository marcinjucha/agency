// --- Formatting helpers ---

export function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Formats bytes into human-readable file size string.
 * Distinct from `formatBytes` which returns null for null input and
 * has different boundary thresholds (no sub-1KB display).
 * Used for downloadable asset display where '0 B' / 'X B' representation is needed.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import { routes } from '@/lib/routes'
import { messages, templates } from '@/lib/messages'
import { type MediaType } from './types'

// --- S3 upload helper for media files ---

export const IMAGE_MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024 // 50MB
export const DOCUMENT_MAX_SIZE = 25 * 1024 * 1024 // 25MB
export const AUDIO_MAX_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Single source of truth for MIME types per MediaType.
 *
 * Used by:
 *  - Server-side allowlist in features/media/server.ts (presigned URL gate)
 *  - Client-side validation in uploadMediaToS3
 *  - InsertMediaModal / MediaUploadZone accept attribute
 *  - getMediaTypeFromMime reverse lookup
 *
 * Adding a new MediaType requires editing this registry — drift impossible.
 * Embed-only types (youtube, vimeo, instagram, tiktok) have empty arrays —
 * no file uploads, URLs only.
 */
export const MEDIA_MIME_REGISTRY = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  // Embed-only — no file uploads, URLs only
  youtube: [],
  vimeo: [],
  instagram: [],
  tiktok: [],
} as const satisfies Record<MediaType, readonly string[]>

/** Flat list of all uploadable MIME types — derived from registry. */
export const ALLOWED_MIME_TYPES: readonly string[] = Object.values(MEDIA_MIME_REGISTRY).flat()

// --- Media type helpers ---

/**
 * Maps a MIME type to its corresponding MediaType using the registry.
 * Returns null for unknown MIME types — callers MUST handle this case.
 *
 * Prevents silent misclassification (e.g. 'application/zip' previously
 * fell back to 'image' via prefix heuristic — overly permissive).
 */
export function getMediaTypeFromMime(mimeType: string): MediaType | null {
  for (const [type, mimes] of Object.entries(MEDIA_MIME_REGISTRY)) {
    if ((mimes as readonly string[]).includes(mimeType)) {
      return type as MediaType
    }
  }
  return null
}

/**
 * Returns true for media types that are ALWAYS downloadable.
 * Document and audio have no meaningful inline display in a browser context.
 * Image, video, and social embed types can be either inline or downloadable.
 */
export function isDownloadableMediaType(type: MediaType): boolean {
  return type === 'document' || type === 'audio'
}

/** Returns the per-type max upload size in bytes. */
function resolveMaxSize(mimeType: string): number {
  if (mimeType.startsWith('video/')) return VIDEO_MAX_SIZE
  if (mimeType.startsWith('audio/')) return AUDIO_MAX_SIZE
  if (mimeType.startsWith('application/')) return DOCUMENT_MAX_SIZE
  return IMAGE_MAX_SIZE
}

/**
 * Browser-side helper: requests a presigned URL from the CMS API and PUTs the
 * file directly to S3 from the user's browser.
 *
 * Why this is intentionally NOT a `createServerFn` (no boundary leak):
 * - The actual security boundary is `generatePresignedUrlFn` in `./server.ts`
 *   (auth check + MIME allowlist + hardcoded folder prefix).
 * - Streaming a >5MB image through a server fn would force the file body
 *   through Vercel's serverless function body limit and lambda RAM. The
 *   browser-direct PUT avoids that entirely.
 * - Mirrors `uploadImageToS3` in `features/blog/utils.ts` — same pattern,
 *   same justification.
 */
export async function uploadMediaToS3(
  file: File
): Promise<{ fileUrl: string; s3Key: string }> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(messages.media.fileTypeNotAllowed)
  }

  const maxSize = resolveMaxSize(file.type)
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024)
    throw new Error(templates.media.fileTooLarge(limitMB))
  }

  const res = await fetch(routes.api.upload, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder: 'haloefekt/media',
    }),
  })
  if (!res.ok) throw new Error(messages.media.uploadUrlError)
  const { uploadUrl, fileUrl, s3Key } = await res.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error(messages.media.s3UploadFailed)

  return { fileUrl, s3Key }
}

// Re-export video utils from shared lib (used by both media + blog features)
export { extractVideoId, generateThumbnailUrl, buildEmbedUrl } from '@/lib/video-utils'
