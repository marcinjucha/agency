// --- Formatting helpers ---

export function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import { routes } from '@/lib/routes'

// --- S3 upload helper for media files ---

export const IMAGE_MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024 // 50MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

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
    throw new Error(
      'Niedozwolony typ pliku. Dozwolone: JPEG, PNG, GIF, WebP, SVG, AVIF, MP4, WebM, MOV.'
    )
  }

  const maxSize = file.type.startsWith('video/') ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024)
    throw new Error(`Plik jest za duzy. Maksymalny rozmiar to ${limitMB}MB.`)
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
  if (!res.ok) throw new Error('Nie udalo sie wygenerowac URL do uploadu')
  const { uploadUrl, fileUrl, s3Key } = await res.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('Upload nie powiodl sie')

  return { fileUrl, s3Key }
}

// Re-export video utils from shared lib (used by both media + blog features)
export { extractVideoId, generateThumbnailUrl, buildEmbedUrl } from '@/lib/video-utils'
