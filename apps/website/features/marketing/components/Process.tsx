import {
  Search,
  Scissors,
  Zap,
  BarChart3,
  Shield,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ProcessBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

const ICON_MAP: Record<string, LucideIcon> = {
  Search,
  Scissors,
  Zap,
  BarChart3,
}

export function Process({
  badge,
  headline,
  headline2,
  steps,
  riskTitle,
  riskDescription,
  proof,
}: ProcessBlock) {
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Guarantee callout — prominent accent block */}
        <ScrollReveal>
          <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-5 py-3.5 mb-10">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
            <p className="text-sm md:text-base font-semibold text-primary leading-snug">
              {badge}
            </p>
          </div>
        </ScrollReveal>

        {/* Dual headlines */}
        <ScrollReveal delay={100}>
          <div className="max-w-3xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3 tracking-tight">
              {headline}
            </h2>
            <p className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gradient bg-gradient-to-r from-primary to-primary/60">
              {headline2}
            </p>
          </div>
        </ScrollReveal>

        {/* Vertical timeline */}
        <div className="relative mb-16">
          {/* Connecting line */}
          <div className="absolute left-[19px] md:left-[19px] top-0 bottom-0 w-px bg-border/50" aria-hidden="true" />

          <div className="space-y-8">
            {steps.map((step, i) => {
              const Icon = ICON_MAP[step.icon] ?? HelpCircle
              return (
                <ScrollReveal key={i} delay={200 + i * 100}>
                  <div className="relative flex items-start gap-6 pl-0">
                    {/* Circle with icon */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>

                    <div className="pt-1">
                      <p className="text-xs font-semibold text-primary uppercase tracking-[0.12em] mb-1.5">
                        {step.label}
                      </p>
                      <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>

        {/* Zero-risk box — high-prominence accent panel */}
        <ScrollReveal delay={600}>
          <div className="rounded-xl border border-primary/40 bg-primary/8 p-6 md:p-8 mb-6">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 tracking-tight">
                  {riskTitle}
                </h3>
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
                  {riskDescription}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Proof line — social proof with stronger visual weight */}
        <ScrollReveal delay={700}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-1 h-full min-h-[1.25rem] rounded-full bg-primary/40 self-stretch" />
            <p className="text-sm md:text-base text-foreground/70 font-medium leading-relaxed max-w-3xl">
              {proof}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
