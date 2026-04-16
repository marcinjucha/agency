import { createFileRoute } from '@tanstack/react-router'
import { getPublishedBlogSlugsForSitemapFn } from '@/features/blog/server'
import { getPublishedLegalSlugsFn } from '@/features/legal/server'
import { CACHE_STATIC } from '@/lib/cache-headers'

const BASE_URL = 'https://haloefekt.pl'

function buildSitemapXml(
  entries: Array<{ url: string; lastmod?: string | null; changefreq?: string; priority?: number }>
): string {
  const urlElements = entries
    .map((entry) => {
      const lastmodTag = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''
      const changefreqTag = entry.changefreq
        ? `\n    <changefreq>${entry.changefreq}</changefreq>`
        : ''
      const priorityTag =
        entry.priority !== undefined
          ? `\n    <priority>${entry.priority.toFixed(1)}</priority>`
          : ''
      return `  <url>\n    <loc>${entry.url}</loc>${lastmodTag}${changefreqTag}${priorityTag}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>`
}

// TanStack Start v1 server file route.
// Returning a Response from the loader serves raw XML for /sitemap.xml.
export const Route = createFileRoute('/sitemap.xml')({
  loader: async () => {
    const [blogEntries, legalSlugs] = await Promise.all([
      getPublishedBlogSlugsForSitemapFn(),
      getPublishedLegalSlugsFn(),
    ])

    const entries = [
      { url: BASE_URL, changefreq: 'monthly', priority: 1.0 },
      { url: `${BASE_URL}/blog`, changefreq: 'daily', priority: 0.8 },
      ...blogEntries.map((entry) => ({
        url: `${BASE_URL}/blog/${entry.slug}`,
        lastmod: entry.updated_at || entry.published_at,
        changefreq: 'weekly',
        priority: 0.7,
      })),
      ...legalSlugs.map((slug) => ({
        url: `${BASE_URL}/${slug}`,
        changefreq: 'yearly',
        priority: 0.3,
      })),
    ]

    const xml = buildSitemapXml(entries)

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ...CACHE_STATIC,
      },
    })
  },
})
