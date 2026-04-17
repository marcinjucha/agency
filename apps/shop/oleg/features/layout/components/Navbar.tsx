import { Link, useRouterState } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const NAV_LINKS = [
  { label: messages.nav.products, href: routes.products },
  { label: messages.nav.contact, href: routes.contact },
] as const

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to={routes.home}
          className="text-lg font-bold text-foreground tracking-tight"
        >
          Oleg
        </Link>

        <div className="flex items-center gap-8">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + '/')
              return (
                <li key={href}>
                  <Link
                    to={href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <Link
            to={`${routes.products}?q=`}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={messages.nav.search}
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  )
}
