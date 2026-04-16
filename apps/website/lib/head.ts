/**
 * Head meta builder for website public routes.
 *
 * Website pages are indexed — no noindex/nofollow.
 * Title pattern: "{page} | Halo Efekt" or the full title for root.
 * Plausible analytics is added via script tag in root layout (iteration 2).
 *
 * NOTE: og:type is NOT emitted here — each route sets it explicitly
 * (website vs article) to avoid duplicate meta tags.
 */

export const BASE_URL = import.meta.env.VITE_HOST_URL ?? 'https://haloefekt.pl'

export function buildWebsiteHead(title: string, description?: string, ogImage?: string, keywords?: string[], canonicalPath?: string) {
  const metaTags: Array<Record<string, string>> = [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title },
  ]

  if (description) {
    metaTags.push({ name: 'description', content: description })
    metaTags.push({ property: 'og:description', content: description })
  }

  if (keywords?.length) {
    metaTags.push({ name: 'keywords', content: keywords.join(', ') })
  }

  metaTags.push({ property: 'og:title', content: title })
  metaTags.push({ property: 'og:site_name', content: 'Halo Efekt' })

  if (ogImage) {
    const absoluteImage = ogImage.startsWith('/') ? `${BASE_URL}${ogImage}` : ogImage
    metaTags.push({ property: 'og:image', content: absoluteImage })
    metaTags.push({ name: 'twitter:card', content: 'summary_large_image' })
    metaTags.push({ name: 'twitter:image', content: absoluteImage })
  }

  return {
    meta: metaTags,
    ...(canonicalPath !== undefined && {
      links: [{ rel: 'canonical', href: `${BASE_URL}${canonicalPath}` }],
    }),
  }
}
