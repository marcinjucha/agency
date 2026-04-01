import type { Metadata } from 'next'
import { getPublishedProducts, getCategories } from '@/features/products/queries'
import { CategoryFilter } from '@/features/products/components/CategoryFilter'
import { ProductGrid } from '@/features/products/components/ProductGrid'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { messages } from '@/lib/messages'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: messages.products.title,
  description: 'Przeglądaj książki i materiały edukacyjne.',
}

export const revalidate = 3600

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { category, q } = await searchParams

  const [products, categories] = await Promise.all([
    getPublishedProducts(category),
    getCategories(),
  ])

  // Client-side search filtering (small catalog)
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{messages.products.title}</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Suspense>
            <CategoryFilter categories={categories} />
          </Suspense>
          <div className="w-full sm:max-w-xs">
            <Suspense>
              <ProductSearch />
            </Suspense>
          </div>
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
      </section>
    </main>
  )
}
