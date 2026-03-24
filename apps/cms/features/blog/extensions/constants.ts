export const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'

// Embed dimensions — single source of truth for renderHTML inline styles and CMS editor CSS.
// IMPORTANT: Website CSS (apps/website/app/globals.css .blog-prose) must be updated manually to match.
export const EMBED_DIMENSIONS = {
  instagram: { maxWidth: 500, height: 800, minHeight: 750 },
  tiktok: { maxWidth: 330, height: 740, minHeight: 700 },
} as const

export const INSTAGRAM_INLINE_STYLE = `width:100%;max-width:${EMBED_DIMENSIONS.instagram.maxWidth}px;height:${EMBED_DIMENSIONS.instagram.height}px;border-radius:0.5rem;margin:1.5rem auto;display:block;background:#000`

export const TIKTOK_INLINE_STYLE = `width:100%;max-width:${EMBED_DIMENSIONS.tiktok.maxWidth}px;height:${EMBED_DIMENSIONS.tiktok.height}px;border-radius:0.5rem;margin:1.5rem auto;display:block;background:#000`
