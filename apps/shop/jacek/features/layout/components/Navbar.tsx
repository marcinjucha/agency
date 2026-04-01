'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const NAV_LINKS = [
  { label: messages.nav.books, href: routes.products },
  { label: messages.nav.about, href: '/o-autorze' },
  { label: messages.nav.contact, href: '/kontakt' },
] as const

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href={routes.home} className="font-serif text-xl font-bold text-foreground">
          Jacek
        </Link>

        <ul className="flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
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
      </nav>
    </header>
  )
}
