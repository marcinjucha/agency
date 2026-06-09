// Global navbar — renders on /blog and blog article pages via __root.tsx.
// Mirrors LandingNavbar's chrome (h-16, max-w-6xl, scroll bg/blur, Logo lockup, primary CTA)
// so navigating between the landing and the blog feels seamless. The landing renders its
// own LandingNavbar; this one covers every other page.
//
// The fixed-header shell (scroll state + className + container + h-16 row + the
// h-16 spacer) is owned by <NavShell>; this component supplies only the row
// content. See nav-shell.tsx.
import { ArrowRight } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { routes } from '@/lib/routes'
import { Logo } from './Logo'
import { CtaLink, buttonClasses } from './primitives'
import { NavShell } from './nav-shell'

const CTA_LABEL = 'Umów bezpłatny audyt'

interface NavbarProps {
  ctaUrl: string
}

export function Navbar({ ctaUrl }: NavbarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isBlogActive = pathname.startsWith(routes.blog)

  return (
    <NavShell withSpacer>
      <div className="flex items-center gap-2">
        <Logo size={28} />
        <Link
          to={routes.blog}
          className={`relative ml-4 px-3 py-2 text-[14px] font-medium transition-colors ${
            isBlogActive
              ? 'text-[var(--ink)]'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Blog
          {isBlogActive && (
            <span className="absolute bottom-1 left-3 right-3 h-px bg-primary" aria-hidden="true" />
          )}
        </Link>
      </div>

      <CtaLink href={ctaUrl} className={buttonClasses('primary', 'sm')}>
        {CTA_LABEL}
        <ArrowRight size={14} strokeWidth={1.75} />
      </CtaLink>
    </NavShell>
  )
}
