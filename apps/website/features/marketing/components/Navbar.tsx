import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@agency/ui'
import type { NavbarBlock } from '@agency/database'
import { routes } from '@/lib/routes'

export function Navbar({ ctaText, ctaHref }: NavbarBlock) {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isBlogActive = pathname.startsWith(routes.blog)

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-out ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-sm shadow-black/8'
            : 'bg-transparent backdrop-blur-none border-b border-transparent'
        }`}
      >
        <nav className="mx-auto px-4 sm:px-6 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to={routes.home} className="group flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight bg-linear-to-r from-orange-700 via-primary to-amber-500 bg-clip-text text-gradient transition-all duration-300 group-hover:from-primary group-hover:via-primary group-hover:to-amber-400">
                  Halo Efekt
                </span>
              </Link>

              <Link
                to={routes.blog}
                className={`nav-link-underline px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  isBlogActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Blog
                {isBlogActive && (
                  <span className="absolute bottom-[-2px] left-0 w-full h-px bg-primary" />
                )}
              </Link>
            </div>

            <Link to={ctaHref}>
              <Button
                size="sm"
                className="cta-glow bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 gap-1.5 group/cta"
              >
                {ctaText}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="h-16" />
    </>
  )
}
