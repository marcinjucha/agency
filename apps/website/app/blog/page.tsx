import type { Metadata } from 'next'
import { getPublishedBlogPosts } from '@/features/blog/queries'
import { BlogListPage } from '@/features/blog/components/BlogListPage'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog | Halo Efekt',
  description:
    'Artyku\u0142y o AI, automatyzacji i optymalizacji proces\u00f3w biznesowych. Dowiedz si\u0119, jak technologia mo\u017ce usprawni\u0107 Twoj\u0105 firm\u0119.',
  openGraph: {
    title: 'Blog | Halo Efekt',
    description:
      'Artyku\u0142y o AI, automatyzacji i optymalizacji proces\u00f3w biznesowych.',
    type: 'website',
    locale: 'pl_PL',
  },
}

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts()

  return <BlogListPage posts={posts} />
}
