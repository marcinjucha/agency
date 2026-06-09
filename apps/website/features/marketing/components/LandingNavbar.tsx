// LandingNavbar — fixed, scroll state, Logo, anchor nav links, primary CTA, mobile menu.
// Faithful port of project/landing/navbar.jsx. No spacer: the hero's pt-28/pt-36 leaves
// room for the overlaying fixed header (matches the prototype).
import { useState, useEffect } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { landingContent } from '../content'
import { Logo } from './Logo'
import { CtaLink, buttonClasses } from './primitives'

interface LandingNavbarProps {
  ctaUrl: string
}

export function LandingNavbar({ ctaUrl }: LandingNavbarProps) {
  const { links, cta } = landingContent.nav
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-[var(--hair)] bg-[var(--bg)]/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo size={28} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="px-3 py-2 text-[14px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
            <Link
              to="/blog"
              className="px-3 py-2 text-[14px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <CtaLink href={ctaUrl} className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}>
              {cta}
              <ArrowRight size={14} strokeWidth={1.75} />
            </CtaLink>
            <button
              type="button"
              className="-mr-2 p-2 text-[var(--ink)] md:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
              aria-expanded={open}
            >
              {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--hair)] bg-[var(--bg)] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[15px] text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
            <Link
              to="/blog"
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] text-[var(--ink)]"
            >
              Blog
            </Link>
            <CtaLink
              href={ctaUrl}
              className={buttonClasses('primary', 'md', 'mt-3 w-full')}
            >
              {cta}
              <ArrowRight size={15} strokeWidth={1.75} />
            </CtaLink>
          </div>
        </div>
      )}
    </header>
  )
}
