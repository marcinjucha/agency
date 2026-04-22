import {
  TrendingUp,
  AlertTriangle,
  Brain,
  User,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import type { IdentificationBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  AlertTriangle,
  Brain,
  User,
}

export function Identification({ eyebrow, items, transition }: IdentificationBlock) {
  return (
    <section className="relative py-16 md:py-24 bg-accent overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.15em] mb-10">
            {eyebrow}
          </p>
        </ScrollReveal>

        {/* Empathy cards — 2x2 on desktop, 1-col on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {items.map((item, i) => {
            const Icon = ICON_MAP[item.icon] ?? HelpCircle
            return (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="flex items-start gap-4 p-5 rounded-xl border-l-2 border-primary/40 bg-background hover:bg-background transition-colors duration-300 shadow-sm">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        <ScrollReveal delay={400}>
          <p className="text-base md:text-lg text-foreground/80 leading-relaxed max-w-3xl">
            {transition}
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
