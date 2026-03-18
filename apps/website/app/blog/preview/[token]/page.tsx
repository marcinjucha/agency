import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogPostByPreviewToken } from '@/features/blog/queries'
import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Podgl\u0105d artyku\u0142u | Halo Efekt',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ token: string }>
}

export default async function BlogPreviewPage({ params }: Props) {
  const { token } = await params
  const post = await getBlogPostByPreviewToken(token)

  if (!post) notFound()

  return <BlogArticlePage post={post} isPreview />
}
