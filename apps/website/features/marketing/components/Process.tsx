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
    <section className="relative py-20 md:py-32 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <ScrollReveal>
          <div className="inline-flex items-center bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-[0.15em] border border-primary/20">
            {badge}
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

        {/* Zero-risk box */}
        <ScrollReveal delay={600}>
          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {riskTitle}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {riskDescription}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Proof line */}
        <ScrollReveal delay={700}>
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-3xl">
            {proof}
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
