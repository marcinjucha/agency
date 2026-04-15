import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getPublishedProducts } from '@/features/products/queries'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const fetchFeaturedProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const products = await getPublishedProducts()
      return { featured: products.slice(0, 6) }
    } catch {
      return { featured: [] }
    }
  },
)

export const Route = createFileRoute('/')({
  loader: () => fetchFeaturedProducts(),
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
  component: HomePage,
})

function HomePage() {
  const { featured } = Route.useLoaderData()

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
              to={routes.products}
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
              to={routes.products}
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
