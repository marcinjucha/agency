import Link from 'next/link'
import type { ShopCategoryPublic } from '../types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type CategorySidebarProps = {
  categories: ShopCategoryPublic[]
  activeCategory?: string
}

export function CategorySidebar({ categories, activeCategory }: CategorySidebarProps) {
  if (categories.length === 0) return null

  return (
    <nav
      className="hidden lg:block w-60 shrink-0"
      aria-label={messages.categories.title}
    >
      <h2 className="text-sm font-semibold mb-3">{messages.categories.title}</h2>

      <div className="space-y-0.5">
        <Link
          href={routes.products}
          className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
            !activeCategory
              ? 'text-primary font-medium bg-primary/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          {messages.categories.all}
        </Link>

        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`${routes.products}?category=${cat.slug}`}
            className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeCategory === cat.slug
                ? 'text-primary font-medium bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
