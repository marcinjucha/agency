import type { MetadataRoute } from 'next'
import { getProductSlugs } from '@/features/products/queries'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://jacek.haloefekt.pl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const basePages: MetadataRoute.Sitemap = [
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
  ]

  let productPages: MetadataRoute.Sitemap = []

  try {
    const slugs = await getProductSlugs()
    productPages = slugs.map((slug) => ({
      url: `${BASE_URL}/produkty/${slug}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  } catch (error) {
    console.error('[sitemap] Failed to fetch product slugs:', (error as Error)?.message ?? 'Unknown error')
  }

  return [...basePages, ...productPages]
}
