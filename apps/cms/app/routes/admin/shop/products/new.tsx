import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  createShopProductFn,
} from '@/features/shop-products/server'
import { ShopProductEditor } from '@/features/shop-products/components/ShopProductEditor'
import type { ShopProduct } from '@/features/shop-products/types'
import type { CreateShopProductFormData } from '@/features/shop-products/validation'

export const Route = createFileRoute('/admin/shop/products/new')({
  head: () => buildCmsHead(messages.shop.newProduct),
  component: ShopProductNewPage,
})

function ShopProductNewPage() {
  return (
    <ShopProductEditor
      createFn={(data: CreateShopProductFormData) =>
        createShopProductFn({ data }) as Promise<{ success: boolean; data?: ShopProduct; error?: string }>
      }
    />
  )
}
