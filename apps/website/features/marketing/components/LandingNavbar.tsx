// LandingNavbar — fixed, scroll state, Logo, anchor nav links, primary CTA, mobile menu.
// Faithful port of project/landing/navbar.jsx. No spacer: the hero's pt-28/pt-36 leaves
// room for the overlaying fixed header (matches the prototype).
//
// The fixed-header shell (scroll state + className + container + h-16 row) is
// owned by <NavShell>; this component supplies the row content plus the mobile
// menu drawer (passed as `belowRow` so it sits inside the fixed <header>). See
// nav-shell.tsx.
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { landingContent } from '../content'
import { Logo } from './Logo'
import { CtaLink, buttonClasses } from './primitives'
import { NavShell } from './nav-shell'

interface LandingNavbarProps {
  ctaUrl: string
}

export function LandingNavbar({ ctaUrl }: LandingNavbarProps) {
  const { links, cta } = landingContent.nav
  const [open, setOpen] = useState(false)

  const mobileMenu = open ? (
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
        <CtaLink href={ctaUrl} className={buttonClasses('primary', 'md', 'mt-3 w-full')}>
          {cta}
          <ArrowRight size={15} strokeWidth={1.75} />
        </CtaLink>
      </div>
    </div>
  ) : null

  return (
    <NavShell belowRow={mobileMenu}>
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
    </NavShell>
  )
}
