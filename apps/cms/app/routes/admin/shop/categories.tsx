import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { CategoryManager } from '@/features/shop-categories/components/CategoryManager'

export const Route = createFileRoute('/admin/shop/categories')({
  head: () => buildCmsHead(messages.shop.categoriesTitle),
  component: ShopCategoriesPage,
})

function ShopCategoriesPage() {
  return <CategoryManager />
}
