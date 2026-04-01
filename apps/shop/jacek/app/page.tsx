import Link from 'next/link'
import { getPublishedProducts } from '@/features/products/queries'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const revalidate = 3600

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getPublishedProducts>> = []
  try {
    const products = await getPublishedProducts()
    featured = products.slice(0, 6)
  } catch {
    // Supabase unreachable at build time — render empty
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {messages.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
            {messages.hero.subtitle}
          </p>
          <div className="mt-8">
            <Link
              href={routes.products}
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {messages.products.seeAll}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-bold">
              {messages.products.featured}
            </h2>
            <Link
              href={routes.products}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
