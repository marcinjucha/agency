import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getProductBySlug } from '@/features/products/queries'
import { buildProductJsonLd } from '@/features/products/utils'
import { GalleryLayout } from '@/features/products/components/GalleryLayout'
import { EditorialLayout } from '@/features/products/components/EditorialLayout'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const fetchProduct = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data: { slug } }) => {
    const product = await getProductBySlug(slug)
    if (!product) throw notFound()
    return { product }
  })

export const Route = createFileRoute('/produkty/$slug')({
  loader: ({ params: { slug } }) => fetchProduct({ data: { slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { product } = loaderData
    const seo = product.seo_metadata as { title?: string; description?: string; og_image_url?: string } | null
    return {
      meta: [
        { title: (seo?.title ?? product.title) + ' | Książki Jacka' },
        { name: 'description', content: seo?.description ?? product.short_description ?? undefined },
        { property: 'og:title', content: seo?.title ?? product.title },
        { property: 'og:description', content: seo?.description ?? product.short_description ?? undefined },
        ...(seo?.og_image_url || product.cover_image_url
          ? [{ property: 'og:image', content: seo?.og_image_url ?? product.cover_image_url ?? '' }]
          : []),
      ],
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { product } = Route.useLoaderData()
  const siteUrl = 'https://jacek.haloefekt.pl'
  const jsonLd = buildProductJsonLd(product, siteUrl)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <Link
          to={routes.products}
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
