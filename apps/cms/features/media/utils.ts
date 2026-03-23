// --- Formatting helpers ---

export function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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

  const res = await fetch('/api/upload', {
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

// --- Video URL parsing ---

export function extractVideoId(
  url: string
): { platform: 'youtube' | 'vimeo'; id: string } | null {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytWatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/
  )
  if (ytWatch?.[1]) {
    return { platform: 'youtube', id: ytWatch[1] }
  }

  // Vimeo: vimeo.com/DIGITS, player.vimeo.com/video/DIGITS
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/
  )
  if (vimeoMatch?.[1]) {
    return { platform: 'vimeo', id: vimeoMatch[1] }
  }

  return null
}

// --- Video thumbnail generation ---

export function generateThumbnailUrl(
  platform: 'youtube' | 'vimeo',
  videoId: string
): string | null {
  if (platform === 'youtube') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }
  // Vimeo requires async oEmbed API call — not feasible in a sync helper
  return null
}
