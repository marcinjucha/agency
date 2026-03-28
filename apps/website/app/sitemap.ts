import type { MetadataRoute } from 'next'
import { getPublishedBlogSlugsForSitemap } from '@/features/blog/queries'
import { getPublishedLegalSlugs } from '@/features/legal/queries'
import { routes } from '@/lib/routes'

const BASE_URL = 'https://haloefekt.pl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogEntries, legalSlugs] = await Promise.all([
    getPublishedBlogSlugsForSitemap(),
    getPublishedLegalSlugs(),
  ])

  const blogSitemapEntries: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: `${BASE_URL}${routes.blogPost(entry.slug)}`,
    lastModified: entry.updated_at || entry.published_at || undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const legalSitemapEntries: MetadataRoute.Sitemap = legalSlugs.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}${routes.blog}`, changeFrequency: 'daily', priority: 0.8 },
    ...blogSitemapEntries,
    ...legalSitemapEntries,
  ]
}
