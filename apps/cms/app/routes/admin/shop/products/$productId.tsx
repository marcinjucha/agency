import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import {
  createShopProductFn,
  updateShopProductFn,
  deleteShopProductFn,
} from '@/features/shop-products/server'
import { queryKeys } from '@/lib/query-keys'
import { ShopProductEditor } from '@/features/shop-products/components/ShopProductEditor'
import type { ShopProduct } from '@/features/shop-products/types'
import type { CreateShopProductFormData } from '@/features/shop-products/validation'
import { useQuery } from '@tanstack/react-query'
import { getShopProduct } from '@/features/shop-products/queries'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { FileX } from 'lucide-react'

export const Route = createFileRoute('/admin/shop/products/$productId')({
  head: () => buildCmsHead(messages.shop.editProduct),
  component: ShopProductEditorPage,
})

function ShopProductEditorPage() {
  const { productId } = Route.useParams()
  const { data: product, isLoading, error } = useQuery<ShopProduct>({
    queryKey: queryKeys.shopProducts.detail(productId),
    queryFn: () => getShopProduct(productId),
  })

  if (isLoading) return <LoadingState variant="skeleton-card" rows={4} />
  if (error) return <ErrorState message={error.message} />
  if (!product) return <EmptyState icon={FileX} title={messages.shop.productNotFound} />

  return (
    <ShopProductEditor
      product={product ?? undefined}
      createFn={(data: CreateShopProductFormData) =>
        createShopProductFn({ data }) as Promise<{ success: boolean; data?: ShopProduct; error?: string }>
      }
      updateFn={(id: string, data: Partial<CreateShopProductFormData>) =>
        updateShopProductFn({ data: { id, data } }) as Promise<{ success: boolean; data?: ShopProduct; error?: string }>
      }
      deleteFn={(id: string) =>
        deleteShopProductFn({ data: { id } }) as Promise<{ success: boolean; error?: string }>
      }
    />
  )
}
