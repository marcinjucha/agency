// Hero — centered variant only (faithful port of project/landing/hero.jsx `centered`).
// The headlineAccent fragment is rendered inside the headline in primary/orange.
import { ArrowRight, ArrowDown } from 'lucide-react'

import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Eyebrow, CtaLink, buttonClasses } from './primitives'

interface HeroProps {
  ctaUrl: string
}

function HeadlineMark() {
  const { headline, headlineAccent } = landingContent.hero
  const parts = headline.split(headlineAccent)
  return (
    <>
      {parts[0]}
      <em className="not-italic text-primary">{headlineAccent}</em>
      {parts[1] || ''}
    </>
  )
}

export function Hero({ ctaUrl }: HeroProps) {
  const { eyebrow, sub, cta, alt } = landingContent.hero
  return (
    <section className="relative overflow-hidden bg-[var(--bg)] grain pt-28 md:pt-36 pb-16 md:pb-20">
      <div
        className="gridlines pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, #000 30%, transparent 75%)',
        }}
      />
      <div className="pointer-events-none absolute top-[-180px] left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <ScrollReveal>
            <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h1
              className="serif mt-6 text-[40px] sm:text-[54px] lg:text-[64px] leading-[1.04] tracking-[-0.025em] text-[var(--ink)]"
              style={{ fontWeight: 500, textWrap: 'balance' }}
            >
              <HeadlineMark />
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p
              className="mt-6 max-w-2xl text-[17px] md:text-[18.5px] leading-relaxed text-[var(--muted)]"
              style={{ textWrap: 'pretty' }}
            >
              {sub}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={240}>
            <div className="mt-9 flex justify-center">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <CtaLink href={ctaUrl} className={buttonClasses('primary', 'lg')}>
                  {cta}
                  <ArrowRight size={17} strokeWidth={1.75} />
                </CtaLink>
                <a href="#obszary" className={buttonClasses('ghost', 'lg')}>
                  {alt}
                  <ArrowDown size={16} strokeWidth={1.75} />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
