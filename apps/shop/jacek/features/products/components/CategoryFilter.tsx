'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ShopCategoryPublic } from '../types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type CategoryFilterProps = {
  categories: ShopCategoryPublic[]
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Filtr kategorii">
      <CategoryPill
        href={routes.products}
        isActive={!activeCategory}
        label={messages.categories.all}
      />
      {categories.map((cat) => (
        <CategoryPill
          key={cat.id}
          href={`${routes.products}?category=${cat.slug}`}
          isActive={activeCategory === cat.slug}
          label={cat.name}
        />
      ))}
    </div>
  )
}

function CategoryPill({
  href,
  isActive,
  label,
}: {
  href: string
  isActive: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground font-medium'
          : 'bg-secondary text-secondary-foreground hover:bg-accent'
      }`}
    >
      {label}
    </Link>
  )
}
