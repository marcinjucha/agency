import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getPublishedProducts, getCategories } from '@/features/products/queries'
import { CategorySidebar } from '@/features/products/components/CategorySidebar'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { messages } from '@/lib/messages'

const fetchProducts = createServerFn({ method: 'GET' })
  .inputValidator((data: { category?: string; q?: string }) => data)
  .handler(async ({ data: { category, q } }) => {
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
  })

export const Route = createFileRoute('/produkty/')({
  validateSearch: (search: Record<string, unknown>) => ({
    category: search.category as string | undefined,
    q: search.q as string | undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category, q: search.q }),
  loader: ({ deps }) => fetchProducts({ data: deps }),
  head: () => ({
    meta: [
      { title: messages.products.title + ' | Sklep Olega' },
      { name: 'description', content: messages.products.metaDescription },
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
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">{messages.products.title}</h1>

      <div className="flex gap-8">
        {/* Sidebar — hidden on mobile via CategorySidebar's hidden lg:block */}
        <CategorySidebar categories={categories} />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <ProductSearch />
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
        </div>
      </div>
    </main>
  )
}
