import type { MetadataRoute } from 'next'
import { getPublishedBlogSlugs } from '@/features/blog/queries'
import { getPublishedLegalSlugs } from '@/features/legal/queries'
import { routes } from '@/lib/routes'

const BASE_URL = 'https://haloefekt.pl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogSlugs, legalSlugs] = await Promise.all([
    getPublishedBlogSlugs(),
    getPublishedLegalSlugs(),
  ])

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${BASE_URL}${routes.blogPost(slug)}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const legalEntries: MetadataRoute.Sitemap = legalSlugs.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}${routes.blog}`, changeFrequency: 'daily', priority: 0.8 },
    ...blogEntries,
    ...legalEntries,
  ]
}
