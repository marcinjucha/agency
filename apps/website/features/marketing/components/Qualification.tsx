import { CheckCircle, Zap } from 'lucide-react'
import type { QualificationBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

export function Qualification({ title, items, separator, techItem }: QualificationBlock) {
  return (
    <section className="relative py-20 md:py-32 bg-background overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 tracking-tight">
              {title}
            </h2>
          </div>
        </ScrollReveal>

        {/* Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {items.map((text, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-muted/20 transition-colors duration-300">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-foreground/90 leading-relaxed">{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Separator */}
        <ScrollReveal delay={400}>
          <div className="flex items-center gap-4 mb-8 max-w-3xl">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/50" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              {separator}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/50" />
          </div>
        </ScrollReveal>

        {/* Tech Qualification */}
        <ScrollReveal delay={500}>
          <div className="flex items-start gap-4 p-6 rounded-xl border border-primary/20 bg-primary/5 max-w-3xl hover:bg-primary/8 transition-colors duration-300">
            <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
              {techItem}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
