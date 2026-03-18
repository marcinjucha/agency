import type { MetadataRoute } from 'next'
import { getPublishedBlogSlugs } from '@/features/blog/queries'

const BASE_URL = 'https://haloefekt.pl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getPublishedBlogSlugs()

  const blogEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...blogEntries,
  ]
}
