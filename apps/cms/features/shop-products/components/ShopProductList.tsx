'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getShopProducts } from '../queries'
import { getShopCategories } from '@/features/shop-categories/queries'
import { deleteShopProduct } from '../actions'
import {
  Button,
  Skeleton,
  ErrorState,
  EmptyState,
} from '@agency/ui'
import Link from 'next/link'
import { ShoppingBag, Plus, LayoutGrid, List } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { ShopProductListView } from './ShopProductListView'

type ViewMode = 'grid' | 'list'

export function ShopProductList() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.shopProducts.list,
    queryFn: getShopProducts,
  })

  const {
    data: categories,
  } = useQuery({
    queryKey: queryKeys.shopCategories.list,
    queryFn: getShopCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteShopProduct(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopProducts.all })
    },
  })

  if (isLoading) return <ShopProductListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.shop.loadProductsFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">{messages.shop.productsTitle}</h1>
        </div>
        <EmptyState
          icon={ShoppingBag}
          title={messages.shop.noProducts}
          description={messages.shop.noProductsDescription}
          variant="card"
          action={
            <Link href={routes.admin.shopProductNew}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {messages.shop.addProduct}
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.shop.productsTitle}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={messages.shop.viewGrid}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={messages.shop.viewList}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Link href={routes.admin.shopProductNew}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {messages.shop.newProduct}
            </Button>
          </Link>
        </div>
      </div>

      {/* Product list/grid */}
      <ShopProductListView
        products={products}
        categories={categories || []}
        onDelete={(id) => deleteMutation.mutate(id)}
        deletingId={deleteMutation.isPending ? (deleteMutation.variables as string | undefined) : undefined}
        viewMode={viewMode}
      />
    </div>
  )
}

// --- Skeleton ---

function ShopProductListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border p-0">
            <Skeleton className="h-40 w-full rounded-t-lg rounded-b-none" />
            <div className="space-y-2 px-4 pb-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
