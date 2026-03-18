import { Check } from 'lucide-react'
import type { BenefitsBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

export function Benefits({ title, items, closing }: BenefitsBlock) {
  return (
    <section className="relative py-20 md:py-32 bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 right-[-200px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 tracking-tight">
              {title}
            </h2>
          </div>
        </ScrollReveal>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {items.map((text, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="group flex items-start gap-3 p-5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm md:text-base text-foreground/90">{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={500}>
          <div className="max-w-3xl">
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {closing}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
