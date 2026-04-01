import type { Metadata } from 'next'
import { getPublishedProducts, getCategories } from '@/features/products/queries'
import { ProductCatalog } from '@/features/products/components/ProductCatalog'
import { messages } from '@/lib/messages'

export const metadata: Metadata = {
  title: messages.products.title,
  description: 'Przeglądaj książki i materiały edukacyjne.',
}

export const revalidate = 3600

type Props = {
  searchParams: Promise<{ category?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { category } = await searchParams

  const [products, categories] = await Promise.all([
    getPublishedProducts(category),
    getCategories(),
  ])

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <ProductCatalog products={products} categories={categories} />
    </main>
  )
}
