import { Shield } from 'lucide-react'
import type { RiskReversalBlock } from '@agency/database'
import { ScrollReveal } from './ScrollReveal'

export function RiskReversal({ title, step1Label, step1Text, step2Label, step2Text, closing, bold, transparency }: RiskReversalBlock) {
  return (
    <section className="relative py-20 md:py-32 bg-background overflow-hidden">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {title}
            </h2>
          </div>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <ScrollReveal delay={100}>
            <div className="group p-6 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/25">
                  1
                </div>
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.12em]">
                  {step1Label}
                </p>
              </div>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                {step1Text}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="group p-6 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/25">
                  2
                </div>
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.12em]">
                  {step2Label}
                </p>
              </div>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                {step2Text}
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Closing Statements */}
        <ScrollReveal delay={300}>
          <div className="max-w-3xl space-y-4">
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              {closing}
            </p>
            <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {bold}
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              {transparency}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
