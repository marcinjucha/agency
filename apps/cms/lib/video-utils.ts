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
