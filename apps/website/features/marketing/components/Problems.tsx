import { RefreshCw, FileSpreadsheet, Mail, UserX } from 'lucide-react'
import type { ProblemsBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

const PROBLEM_ICONS = [RefreshCw, FileSpreadsheet, Mail, UserX]

export function Problems({ title, stat, items }: ProblemsBlock) {
  return (
    <section className="relative py-16 md:py-24 bg-background overflow-hidden">
      {/* Subtle top gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-12">
              {stat}
            </p>
          </div>
        </ScrollReveal>

        {/* Full-width stacked rows */}
        <div className="space-y-3">
          {items.map((text, i) => {
            const Icon = PROBLEM_ICONS[i % PROBLEM_ICONS.length]
            return (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="group flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-destructive/30 transition-all duration-300">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors duration-300">
                    <Icon className="w-4.5 h-4.5 text-destructive/80" />
                  </div>
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">{text}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
