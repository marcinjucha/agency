'use client'

import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@agency/ui'
import type { NavbarBlock } from '@agency/database'

const NAV_LINKS = [
  { href: '/', label: 'Strona glowna' },
  { href: '/blog', label: 'Blog' },
] as const

export function Navbar({ ctaText, ctaHref }: NavbarBlock) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-out ${
          isScrolled
            ? 'top-3 left-4 right-4 sm:left-6 sm:right-6 lg:left-auto lg:right-auto lg:max-w-5xl lg:mx-auto lg:inset-x-6 bg-background/70 backdrop-blur-2xl rounded-2xl border border-border/40 shadow-lg shadow-black/20 navbar-border-gradient'
            : 'bg-transparent'
        }`}
      >
        <nav className={`mx-auto px-4 sm:px-6 transition-all duration-500 ${
          isScrolled ? 'py-2.5 max-w-none' : 'py-4 max-w-6xl'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="group flex items-center gap-2"
              >
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-gradient transition-all duration-300 group-hover:from-primary group-hover:to-primary/70">
                  Halo Efekt
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
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

            <div className="hidden sm:flex">
              <Link href={ctaHref}>
                <Button
                  size="sm"
                  className="cta-glow bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 gap-1.5 group/cta"
                >
                  {ctaText}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-accent/40"
              aria-label={isMenuOpen ? 'Zamknij menu' : 'Otworz menu'}
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
              href={link.href}
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
          <Link href={ctaHref}>
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
