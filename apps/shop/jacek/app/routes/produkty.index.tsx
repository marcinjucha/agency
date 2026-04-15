import { createFileRoute } from '@tanstack/react-router'
import { getPublishedProducts, getCategories } from '@/features/products/queries'
import { CategoryFilter } from '@/features/products/components/CategoryFilter'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/produkty/')({
  validateSearch: (search: Record<string, unknown>) => ({
    category: search.category as string | undefined,
    q: search.q as string | undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category, q: search.q }),
  loader: async ({ deps: { category, q } }) => {
    const [products, categories] = await Promise.all([
      getPublishedProducts(category),
      getCategories(),
    ])

    const filtered = q
      ? products.filter((p) => {
          const query = q.toLowerCase()
          return (
            p.title.toLowerCase().includes(query) ||
            (p.short_description?.toLowerCase().includes(query) ?? false)
          )
        })
      : products

    return { products: filtered, categories, q }
  },
  head: () => ({
    meta: [
      { title: messages.products.title + ' | Książki Jacka' },
      { name: 'description', content: 'Przeglądaj książki i materiały edukacyjne.' },
    ],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
  component: ProductsPage,
})

function ProductsPage() {
  const { products, categories, q } = Route.useLoaderData()

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{messages.products.title}</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilter categories={categories} />
          <div className="w-full sm:max-w-xs">
            <ProductSearch />
          </div>
        </div>

        {q && products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              {messages.search.noResults} &ldquo;{q}&rdquo;
            </p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </main>
  )
}
