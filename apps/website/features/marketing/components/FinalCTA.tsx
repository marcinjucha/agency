import { ArrowRight, Shield } from 'lucide-react'
import type { CtaBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'
import { CtaLink } from './CtaLink'

export function FinalCTA({ headline, description, button, trustLine }: CtaBlock) {
  return (
    <section
      id="contact"
      className="relative py-24 md:py-32 lg:py-40 bg-background overflow-hidden noise-overlay"
      aria-label="Sekcja kontaktowa"
    >
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/10 blur-[150px] -translate-y-1/2 animate-glow-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] translate-y-1/3 translate-x-1/4" />
      </div>

      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight max-w-3xl mx-auto">
            {headline}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <CtaLink
            href={button.href}
            location="final_cta"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-10 py-5 text-lg font-semibold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300 group cta-glow"
          >
            {button.text}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </CtaLink>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="flex items-center justify-center gap-2 mt-8">
            <Shield className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-muted-foreground/60 text-sm">
              {trustLine}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
