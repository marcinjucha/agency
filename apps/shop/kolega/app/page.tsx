import Link from 'next/link'
import {
  getFeaturedProducts,
  getPublishedProducts,
} from '@/features/products/queries'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const revalidate = 3600

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getPublishedProducts>> = []
  try {
    const result = await getFeaturedProducts()
    featured =
      result.length > 0
        ? result
        : (await getPublishedProducts()).slice(0, 8)
  } catch {
    // Supabase unreachable at build time — render empty
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {messages.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {messages.hero.subtitle}
          </p>
          <Link
            href={routes.products}
            className="mt-8 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {messages.hero.cta}
          </Link>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">
              {messages.products.featured}
            </h2>
            <Link
              href={routes.products}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {messages.products.seeAll} &rarr;
            </Link>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}
    </main>
  )
}
