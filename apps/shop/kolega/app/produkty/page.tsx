import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPublishedProducts, getCategories } from '@/features/products/queries'
import { CategorySidebar } from '@/features/products/components/CategorySidebar'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { messages } from '@/lib/messages'

export const metadata: Metadata = {
  title: messages.products.title,
  description: messages.products.metaDescription,
}

export const revalidate = 3600

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { category, q } = await searchParams

  let products: Awaited<ReturnType<typeof getPublishedProducts>> = []
  let categories: Awaited<ReturnType<typeof getCategories>> = []

  try {
    ;[products, categories] = await Promise.all([
      getPublishedProducts(category),
      getCategories(),
    ])
  } catch {
    // Supabase unreachable at build time — render empty
  }

  const filtered = q
    ? products.filter((p) => {
        const query = q.toLowerCase()
        return (
          p.title.toLowerCase().includes(query) ||
          (p.short_description?.toLowerCase().includes(query) ?? false)
        )
      })
    : products

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">{messages.products.title}</h1>

      <div className="flex gap-8">
        {/* Sidebar — hidden on mobile via CategorySidebar's hidden lg:block */}
        <CategorySidebar categories={categories} activeCategory={category} />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <Suspense>
              <ProductSearch />
            </Suspense>
          </div>

          {q && filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">
                {messages.search.noResults} &ldquo;{q}&rdquo;
              </p>
            </div>
          ) : (
            <ProductGrid products={filtered} />
          )}
        </div>
      </div>
    </main>
  )
}
