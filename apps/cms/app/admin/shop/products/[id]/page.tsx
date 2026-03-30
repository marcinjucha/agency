import { notFound } from 'next/navigation'
import { ShopProductEditor } from '@/features/shop-products/components/ShopProductEditor'
import { getShopProductServer } from '@/features/shop-products/queries.server'

export default async function EditShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getShopProductServer(id)

  if (!product) {
    notFound()
  }

  return <ShopProductEditor product={product} />
}
