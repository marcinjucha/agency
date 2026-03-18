import { ArrowRight } from 'lucide-react'
import type { HeroBlock } from '@agency/database'

export function Hero({ metric1Value, metric1Label, metric2Value, metric2Label, qualifiers, badNews, goodNews, valueProp, guarantee, cta }: HeroBlock) {
  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40 bg-background overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] animate-glow-pulse pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-80px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] animate-glow-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-primary/3 blur-[150px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(hsl(216 34% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(216 34% 50%) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Banner */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-0 mb-16 md:mb-20 animate-fade-in-up">
          <div className="flex-1 sm:border-r sm:border-border/50 sm:pr-10">
            <p className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gradient bg-gradient-to-r from-primary to-primary/60">
              {metric1Value}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 uppercase tracking-[0.15em] font-medium">
              {metric1Label}
            </p>
          </div>
          <div className="flex-1 sm:pl-10">
            <p className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
              {metric2Value}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 uppercase tracking-[0.15em] font-medium">
              {metric2Label}
            </p>
          </div>
        </div>

        <div className="max-w-3xl">
          {/* Qualifier Statements */}
          <div className="space-y-2 mb-10 animate-fade-in-up animate-delay-200">
            {qualifiers.map((text, i) => (
              <p key={i} className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {text}
              </p>
            ))}
          </div>

          {/* Bad News / Good News Hook */}
          <div className="mb-12 space-y-4 animate-fade-in-up animate-delay-300">
            <p className="text-lg text-muted-foreground/80">
              {badNews}
            </p>
            <p className="text-2xl md:text-3xl font-semibold text-foreground leading-snug tracking-tight">
              {goodNews}
            </p>
          </div>

          {/* Value Proposition */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 animate-fade-in-up animate-delay-400">
            {valueProp}
          </p>

          {/* Risk-Free Guarantee */}
          <div className="mb-12 glass-card rounded-xl p-5 animate-fade-in-up animate-delay-500">
            <p className="text-base text-muted-foreground leading-relaxed">
              {guarantee}
            </p>
          </div>

          {/* CTA */}
          <div className="animate-fade-in-up animate-delay-600">
            <a
              href="#contact"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-4 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 group"
            >
              {cta}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
