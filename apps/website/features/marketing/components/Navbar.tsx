// Global navbar — renders on /blog and blog article pages via __root.tsx.
// Mirrors LandingNavbar's chrome (h-16, max-w-6xl, scroll bg/blur, Logo lockup, primary CTA)
// so navigating between the landing and the blog feels seamless. The landing renders its
// own LandingNavbar; this one covers every other page.
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { routes } from '@/lib/routes'
import { Logo } from './Logo'
import { CtaLink, buttonClasses } from './primitives'

const CTA_LABEL = 'Umów bezpłatny audyt'

interface NavbarProps {
  ctaUrl: string
}

export function Navbar({ ctaUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isBlogActive = pathname.startsWith(routes.blog)

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[var(--hair)] bg-[var(--bg)]/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
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
          </div>
        </div>
      </header>

      <div className="h-16" />
    </>
  )
}
