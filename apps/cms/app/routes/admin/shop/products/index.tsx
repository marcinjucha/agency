import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ShopProductList } from '@/features/shop-products/components/ShopProductList'

export const Route = createFileRoute('/admin/shop/products/')({
  head: () => buildCmsHead(messages.shop.productsTitle),
  component: ShopProductsPage,
})

function ShopProductsPage() {
  return <ShopProductList />
}
