'use client'

import { Link, useSearch } from '@tanstack/react-router'
import type { ShopCategoryPublic } from '../types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type CategoryFilterProps = {
  categories: ShopCategoryPublic[]
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const search = useSearch({ strict: false })
  const activeCategory = search.category as string | undefined

  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Filtr kategorii">
      <CategoryPill
        to={routes.products}
        isActive={!activeCategory}
        label={messages.categories.all}
      />
      {categories.map((cat) => (
        <CategoryPill
          key={cat.id}
          to={routes.products}
          search={{ category: cat.slug }}
          isActive={activeCategory === cat.slug}
          label={cat.name}
        />
      ))}
    </div>
  )
}

function CategoryPill({
  to,
  search,
  isActive,
  label,
}: {
  to: string
  search?: Record<string, string>
  isActive: boolean
  label: string
}) {
  return (
    <Link
      to={to}
      search={search}
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
