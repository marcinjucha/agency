import { Link, useRouterState, getRouteApi } from '@tanstack/react-router'
import { routes } from '@/lib/routes'

const rootRoute = getRouteApi('__root__')

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { navProducts } = rootRoute.useLoaderData()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-4"
        aria-label="Nawigacja główna"
      >
        <Link
          to={routes.home}
          className="shrink-0 font-serif text-xl font-bold text-foreground transition-opacity hover:opacity-80"
          aria-label="Strona główna — Jacek Jucha"
        >
          Jacek
        </Link>

        {navProducts.length > 0 && (
          <ul
            className="flex items-center gap-6 overflow-x-auto"
            role="list"
          >
            {navProducts.map((product) => {
              const href = routes.product(product.slug)
              const isActive =
                pathname === href || pathname.startsWith(href + '/')
              return (
                <li key={product.id} className="shrink-0">
                  <Link
                    to={href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? 'font-medium text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {product.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </header>
  )
}
