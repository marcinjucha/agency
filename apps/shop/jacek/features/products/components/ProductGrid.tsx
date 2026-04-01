import type { ShopProductPublic } from '../types'
import { ProductCard } from './ProductCard'
import { messages } from '@/lib/messages'

type ProductGridProps = {
  products: ShopProductPublic[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{messages.products.empty}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
