'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { getShopCategories } from '@/features/shop-categories/queries'

interface ShopCategorySelectProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
}

export function ShopCategorySelect({ id, value, onChange }: ShopCategorySelectProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.shopCategories.list,
    queryFn: getShopCategories,
  })

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      disabled={isLoading}
    >
      <SelectTrigger id={id} className="text-sm">
        <SelectValue placeholder={messages.shop.noCategory} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{messages.shop.noCategory}</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <span>{cat.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">/{cat.slug}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
