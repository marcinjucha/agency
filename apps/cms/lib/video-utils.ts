// --- Vimeo thumbnail (async oEmbed) ---

export async function fetchVimeoThumbnail(
  vimeoUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail_url ?? null
  } catch {
    return null
  }
}

// --- Video URL parsing ---

export function extractVideoId(
  url: string
): { platform: 'youtube' | 'vimeo' | 'instagram' | 'tiktok'; id: string } | null {
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

  // Instagram: instagram.com/p/ID/, instagram.com/reel/ID/, instagram.com/tv/ID/
  const igMatch = url.match(
    /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/
  )
  if (igMatch?.[1]) {
    return { platform: 'instagram', id: igMatch[1] }
  }

  // TikTok: tiktok.com/@user/video/ID, vm.tiktok.com/ID, tiktok.com/t/ID
  const ttFullMatch = url.match(
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/
  )
  if (ttFullMatch?.[1]) {
    return { platform: 'tiktok', id: ttFullMatch[1] }
  }

  const ttShortMatch = url.match(
    /(?:vm\.tiktok\.com|tiktok\.com\/t)\/([\w-]+)/
  )
  if (ttShortMatch?.[1]) {
    return { platform: 'tiktok', id: ttShortMatch[1] }
  }

  return null
}

// --- Video thumbnail generation ---

export function generateThumbnailUrl(
  platform: 'youtube' | 'vimeo' | 'instagram' | 'tiktok',
  videoId: string
): string | null {
  if (platform === 'youtube') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }
  // Vimeo requires async oEmbed API call — not feasible in a sync helper
  // Instagram and TikTok have no deterministic thumbnail URLs
  return null
}

// --- Video embed URL generation ---

export function buildEmbedUrl(
  platform: 'youtube' | 'vimeo' | 'instagram' | 'tiktok',
  id: string
): string {
  if (platform === 'youtube') return `https://www.youtube.com/embed/${id}`
  if (platform === 'vimeo') return `https://player.vimeo.com/video/${id}`
  if (platform === 'instagram') return `https://www.instagram.com/p/${id}/embed/`
  return `https://www.tiktok.com/embed/v2/${id}`
}
