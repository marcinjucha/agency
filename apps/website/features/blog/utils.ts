import type { WebsiteBlogPost } from './types'

export function formatPolishDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Builds schema.org Article JSON-LD for a blog post */
export function buildArticleJsonLd(post: WebsiteBlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || undefined,
    author: post.author_name
      ? { '@type': 'Person', name: post.author_name }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Halo Efekt',
    },
  }
}
