// FinalCTA — light warm `--bg-tint` rounded panel (NOT dark). id="audyt".
// Faithful port of project/landing/cta.jsx CTA().
import { ArrowRight } from 'lucide-react'

import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, Eyebrow, CtaLink, buttonClasses } from './primitives'

interface FinalCTAProps {
  ctaUrl: string
}

export function FinalCTA({ ctaUrl }: FinalCTAProps) {
  const { eyebrow, title, desc, cta } = landingContent.cta
  return (
    <Section id="audyt" tone="white">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-[var(--bg-tint)] px-6 py-14 text-center ring-accent md:px-12 md:py-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[300px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <ScrollReveal>
              <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h2
                className="serif mt-5 text-[32px] md:text-[46px] leading-[1.08] tracking-[-0.02em] text-[var(--ink)]"
                style={{ fontWeight: 500, textWrap: 'balance' }}
              >
                {title}
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={140}>
              <p
                className="mt-5 text-[16.5px] md:text-[18px] leading-relaxed text-[var(--muted)]"
                style={{ textWrap: 'pretty' }}
              >
                {desc}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="mt-9">
                <CtaLink href={ctaUrl} className={buttonClasses('primary', 'lg')}>
                  {cta}
                  <ArrowRight size={17} strokeWidth={1.75} />
                </CtaLink>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </Container>
    </Section>
  )
}
