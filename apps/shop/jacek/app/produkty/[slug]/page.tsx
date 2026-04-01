import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getProductSlugs } from '@/features/products/queries'
import { buildProductJsonLd } from '@/features/products/utils'
import { GalleryLayout } from '@/features/products/components/GalleryLayout'
import { EditorialLayout } from '@/features/products/components/EditorialLayout'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const revalidate = 3600

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: messages.common.notFound }

  const seo = product.seo_metadata

  return {
    title: seo?.title ?? product.title,
    description: seo?.description ?? product.short_description ?? undefined,
    openGraph: {
      title: seo?.title ?? product.title,
      description: seo?.description ?? product.short_description ?? undefined,
      images: seo?.og_image_url
        ? [{ url: seo.og_image_url }]
        : product.cover_image_url
          ? [{ url: product.cover_image_url }]
          : undefined,
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jacek.haloefekt.pl'
  const jsonLd = buildProductJsonLd(product, siteUrl)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <Link
          href={routes.products}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; {messages.products.backToList}
        </Link>
      </div>

      {product.display_layout === 'editorial' ? (
        <EditorialLayout product={product} />
      ) : (
        <GalleryLayout product={product} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
