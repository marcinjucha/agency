import { createFileRoute } from '@tanstack/react-router'
import { getProductSlugs } from '@/features/products/queries'

const BASE_URL = 'https://kolega.haloefekt.pl'

const staticPages = [
  { url: BASE_URL, priority: '1.0', changefreq: 'weekly' },
  { url: `${BASE_URL}/produkty`, priority: '0.9', changefreq: 'weekly' },
  { url: `${BASE_URL}/kontakt`, priority: '0.5', changefreq: 'monthly' },
]

function buildSitemapXml(productSlugs: string[]): string {
  const productPages = productSlugs.map((slug) => ({
    url: `${BASE_URL}/produkty/${slug}`,
    priority: '0.8',
    changefreq: 'weekly',
  }))

  const allPages = [...staticPages, ...productPages]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  component: () => null,
  server: {
    handlers: {
      GET: async () => {
        let productSlugs: string[] = []
        try {
          productSlugs = await getProductSlugs()
        } catch {
          // Supabase unreachable — serve base pages only
        }

        return new Response(buildSitemapXml(productSlugs), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
