import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@agency/ui'
import type { NavbarBlock } from '@agency/database'
import { routes } from '@/lib/routes'

const NAV_LINKS = [
  { href: routes.home, label: 'Strona główna' },
  { href: routes.blog, label: 'Blog' },
] as const

export function Navbar({ ctaText, ctaHref }: NavbarBlock) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showNavCta, setShowNavCta] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- subscribing to pathname changes to reset menu
  useEffect(() => setIsMenuOpen(false), [pathname])

  useEffect(() => {
    const heroCta = document.getElementById('hero-cta')
    if (!heroCta) {
      // No hero CTA on this page — always show nav CTA
      const id = requestAnimationFrame(() => setShowNavCta(true))
      return () => cancelAnimationFrame(id)
    }
    const observer = new IntersectionObserver(([entry]) => setShowNavCta(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: '-80px 0px 0px 0px',
    })
    observer.observe(heroCta)
    return () => observer.disconnect()
  }, [pathname])

  function isActive(href: string) {
    if (href === routes.home) return pathname === routes.home
    return pathname.startsWith(href)
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-out ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-lg shadow-black/25'
            : 'bg-transparent backdrop-blur-none border-b border-transparent'
        }`}
      >
        <nav className="mx-auto px-4 sm:px-6 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to={routes.home} className="group flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight bg-linear-to-r from-foreground via-foreground to-primary bg-clip-text text-gradient transition-all duration-300 group-hover:from-primary group-hover:to-primary/70">
                  Halo Efekt
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`nav-link-underline px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      isActive(link.href)
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {link.label}
                    {isActive(link.href) && (
                      <span className="absolute bottom-[-2px] left-0 w-full h-px bg-primary" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div
              className={`hidden sm:flex transition-all duration-300 ease-out ${
                showNavCta
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
              }`}
            >
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

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-accent/40"
              aria-label={isMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 sm:hidden transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-2xl border-l border-border/30 z-50 sm:hidden transition-transform duration-300 ease-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <span className="text-sm font-semibold text-foreground">Menu</span>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/40"
            aria-label="Zamknij menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? 'text-foreground bg-accent/50 border border-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="px-4 py-4 mt-auto border-t border-border/30 absolute bottom-0 left-0 right-0">
          <Link to={ctaHref}>
            <Button className="cta-glow bg-primary hover:bg-primary/90 text-primary-foreground w-full gap-1.5 group/cta">
              {ctaText}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="h-16" />
    </>
  )
}
