import type { Metadata } from 'next'
import { getPublishedBlogPosts } from '@/features/blog/queries'
import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { getSiteSettings } from '@/features/site-settings/queries'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings()

  return {
    title: 'Blog',
    description:
      'Artykuły o AI, automatyzacji i optymalizacji procesów biznesowych. Dowiedz się, jak technologia może usprawnić Twoją firmę.',
    keywords:
      siteSettings?.default_keywords?.length
        ? [...new Set(siteSettings.default_keywords.map((k) => k.toLowerCase()))]
        : undefined,
    openGraph: {
      title: 'Blog | Halo Efekt',
      description:
        'Artykuły o AI, automatyzacji i optymalizacji procesów biznesowych.',
      type: 'website',
      locale: 'pl_PL',
    },
  }
}

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts()

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog | Halo Efekt',
    description:
      'Artykuły o AI, automatyzacji i optymalizacji procesów biznesowych.',
    mainEntity: {
      '@type': 'Blog',
      name: 'Blog Halo Efekt',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <BlogListPage posts={posts} />
    </>
  )
}
