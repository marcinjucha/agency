import { Search, Sparkles, Cog, BarChart3 } from 'lucide-react'
import type { GuaranteeBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

const STEP_ICONS = [Search, Sparkles, Cog, BarChart3]

export function Guarantee({ badge, headline, headline2, description, steps, proof }: GuaranteeBlock) {
  return (
    <section className="relative py-20 md:py-32 bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-[-200px] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[130px] pointer-events-none" />

      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          {/* Badge */}
          <div className="inline-flex items-center bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-[0.15em] border border-primary/20">
            {badge}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3 tracking-tight">
              {headline}
            </h2>
            <p className="text-3xl md:text-4xl font-bold leading-tight mb-8 tracking-tight text-gradient bg-gradient-to-r from-primary to-primary/60">
              {headline2}
            </p>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-16">
              {description}
            </p>
          </div>
        </ScrollReveal>

        {/* 4-Step Process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {steps.map((text, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length]
            return (
              <ScrollReveal key={i} delay={200 + i * 100}>
                <div className="group p-5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
                      Krok {i + 1}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Social Proof Metric */}
        <ScrollReveal delay={600}>
          <div className="max-w-3xl glass-card rounded-xl p-6">
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              {proof}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
