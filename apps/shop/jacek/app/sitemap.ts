import type { MetadataRoute } from 'next'
import { getProductSlugs } from '@/features/products/queries'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://jacek.haloefekt.pl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getProductSlugs()

  const productPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/produkty/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/produkty`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...productPages,
  ]
}
