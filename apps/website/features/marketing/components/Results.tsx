import { Check } from 'lucide-react'
import type { ResultsBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

export function Results({
  title,
  metrics,
  outcomes,
  qualificationTitle,
  qualificationItems,
}: ResultsBlock) {
  return (
    <section className="relative py-16 md:py-24 bg-background overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 tracking-tight">
            {title}
          </h2>
        </ScrollReveal>

        {/* Metric strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {metrics.map((metric, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="p-6 rounded-xl border border-border/50 bg-muted/20 text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary tracking-tight mb-2">
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] font-medium">
                  {metric.label}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Outcome cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {outcomes.map((outcome, i) => (
            <ScrollReveal key={i} delay={300 + i * 100}>
              <div className="p-6 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300 h-full">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {outcome.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {outcome.detail}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Qualification section */}
        <ScrollReveal delay={600}>
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              {qualificationTitle}
            </h3>
            <div className="space-y-3">
              {qualificationItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
