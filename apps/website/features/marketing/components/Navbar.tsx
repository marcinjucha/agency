'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@agency/ui'
import type { NavbarBlock } from '@agency/database'

export function Navbar({ ctaText, ctaHref }: NavbarBlock) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="text-xl font-bold text-foreground hover:text-primary transition-colors"
            >
              Halo Efekt
            </a>

            {/* Desktop CTA */}
            <div className="hidden sm:flex">
              <a href={ctaHref}>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {ctaText}
                </Button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label={isMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 sm:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-background shadow-lg z-50 sm:hidden">
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Zamknij menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-4">
              <a href={ctaHref} onClick={() => setIsMenuOpen(false)}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                  {ctaText}
                </Button>
              </a>
            </div>
          </div>
        </>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  )
}
