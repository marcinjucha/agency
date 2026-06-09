// SiteFooter — faithful port of project/landing/footer.jsx.
// Brand serif "Halo Efekt", tagline, contact label + mailto email, primary CTA,
// bottom row © 2026 + legal Links (TanStack <Link> to existing routes).
import { ArrowRight, Mail } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { landingContent } from '../content'
import { Container, CtaLink, buttonClasses } from './primitives'

interface SiteFooterProps {
  ctaUrl: string
}

export function SiteFooter({ ctaUrl }: SiteFooterProps) {
  const { tagline, contactLabel, email, cta } = landingContent.footer
  return (
    <footer className="relative border-t border-[var(--hair)] bg-[var(--bg)] pt-16 pb-10">
      <Container>
        <div className="grid items-start gap-10 md:grid-cols-[1fr_auto] md:gap-16">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Halo Efekt"
                width={32}
                height={32}
                className="block object-contain"
                style={{ width: 32, height: 32 }}
              />
              <div className="serif text-[24px] tracking-[-0.01em] text-[var(--ink)]" style={{ fontWeight: 600 }}>
                Halo<span className="text-primary"> Efekt</span>
              </div>
            </div>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--muted)]" style={{ textWrap: 'pretty' }}>
              {tagline}
            </p>
          </div>
          <div className="md:text-right">
            <div className="text-[14px] text-[var(--muted)]">{contactLabel}</div>
            <a
              href={`mailto:${email}`}
              className="serif mt-2 inline-flex items-center gap-2 text-[20px] md:text-[22px] text-[var(--ink)] transition-colors hover:text-primary"
              style={{ fontWeight: 500 }}
            >
              <Mail size={18} strokeWidth={1.75} className="text-primary" />
              {email}
            </a>
            <div className="mt-5 flex md:justify-end">
              <CtaLink href={ctaUrl} className={buttonClasses('primary', 'md')}>
                {cta}
                <ArrowRight size={15} strokeWidth={1.75} />
              </CtaLink>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[var(--hair)] pt-6 sm:flex-row">
          <p className="mono text-[11px] text-[var(--muted-2)]">© 2026 Halo Efekt</p>
          <nav className="flex items-center gap-6 text-[13px] text-[var(--muted-2)]">
            <Link to="/polityka-prywatnosci" className="transition-colors hover:text-[var(--ink)]">
              Polityka prywatności
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  )
}
