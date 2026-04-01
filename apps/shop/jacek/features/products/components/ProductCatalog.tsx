import type { ShopProductPublic, ShopCategoryPublic } from '../types'
import { CategoryFilter } from './CategoryFilter'
import { ProductGrid } from './ProductGrid'
import { messages } from '@/lib/messages'

type ProductCatalogProps = {
  products: ShopProductPublic[]
  categories: ShopCategoryPublic[]
}

export function ProductCatalog({ products, categories }: ProductCatalogProps) {
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{messages.products.title}</h1>
      </div>

      <CategoryFilter categories={categories} />

      <ProductGrid products={products} />
    </section>
  )
}
