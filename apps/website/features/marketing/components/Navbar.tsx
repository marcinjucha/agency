'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@legal-mind/ui'

interface NavbarProps {
  onDemoClick?: () => void
}

export function Navbar({ onDemoClick }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll event for sticky header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu when clicking on a link
  const handleNavLinkClick = () => {
    setIsMenuOpen(false)
  }

  // Handle demo button click
  const handleDemoClick = () => {
    setIsMenuOpen(false)
    onDemoClick?.()
  }

  const navLinks = [
    { label: 'Solutions', href: '#solutions' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'O nas', href: '#o-nas' },
    { label: 'Kontakt', href: '#kontakt' },
    { label: 'Blog', href: '#blog' }
  ]

  return (
    <>
      {/* Sticky Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-card transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-bold text-foreground hover:text-primary transition-colors"
            >
              <span>Legal Hub</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleNavLinkClick}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm"
                  aria-label={`Navigate to ${link.label}`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop Demo Button */}
            <div className="hidden lg:flex">
              <Button
                onClick={handleDemoClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="default"
              >
                Zarezerwuj demo
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 text-muted-foreground hover:text-primary transition-colors"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Menu Panel */}
          <div
            id="mobile-menu"
            className="fixed top-0 right-0 h-full w-64 bg-card shadow-lg z-50 lg:hidden transform transition-transform duration-300 ease-out"
            style={{
              transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)'
            }}
          >
            {/* Close Button in Menu */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-3 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Menu Links */}
            <div className="px-4 py-8 space-y-4 flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleNavLinkClick}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium text-base block py-2"
                  aria-label={`Navigate to ${link.label}`}
                >
                  {link.label}
                </a>
              ))}

              {/* Mobile Demo Button */}
              <Button
                onClick={handleDemoClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full mt-4"
                size="default"
              >
                Zarezerwuj demo
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-20" />
    </>
  )
}
