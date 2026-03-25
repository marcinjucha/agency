import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedBlogPost, getPublishedBlogSlugs } from '@/features/blog/queries'
import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'
import { buildArticleJsonLd } from '@/features/blog/utils'
import type { SeoMetadata } from '@/features/blog/types'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedBlogPost(slug)

  if (!post) {
    return { title: 'Nie znaleziono artyku\u0142u | Halo Efekt' }
  }

  const seo = post.seo_metadata as SeoMetadata | null

  return {
    title: seo?.title || `${post.title} | Halo Efekt`,
    description: seo?.description || post.excerpt || undefined,
    openGraph: {
      title: seo?.title || post.title,
      description: seo?.description || post.excerpt || undefined,
      type: 'article',
      locale: 'pl_PL',
      publishedTime: post.published_at || undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: seo?.ogImage || post.cover_image_url
        ? [{ url: (seo?.ogImage || post.cover_image_url)! }]
        : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPublishedBlogPost(slug)

  if (!post) notFound()

  const jsonLd = buildArticleJsonLd(post)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticlePage post={post} />
    </>
  )
}
