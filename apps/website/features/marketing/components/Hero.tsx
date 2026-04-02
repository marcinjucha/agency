import { ArrowRight, ShieldCheck } from 'lucide-react'
import type { HeroBlock } from '@agency/database'
import { CtaLink } from './CtaLink'

export function Hero({ headline, subheadline, cta, trustLine }: HeroBlock) {
  return (
    <section className="relative pt-16 pb-16 md:pt-24 md:pb-24 lg:pt-32 lg:pb-24 bg-background overflow-hidden">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-in-up">
              <span className="text-gradient bg-gradient-to-r from-primary to-primary/60">
                {headline}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 animate-fade-in-up animate-delay-200">
              {subheadline}
            </p>

            <div className="animate-fade-in-up animate-delay-300">
              <CtaLink
                id="hero-cta"
                href={cta.href}
                location="hero"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-4 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 group cta-glow"
              >
                {cta.text}
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </CtaLink>
            </div>

            <div className="inline-flex items-center gap-3 border border-primary/20 bg-primary/5 rounded-xl px-4 py-3 mt-6 animate-fade-in-up animate-delay-400">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm text-foreground/70">{trustLine}</p>
            </div>
          </div>

          {/* Decorative element — abstract geometric shape */}
          <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
            <div className="relative w-80 h-80">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-float" />
              {/* Middle ring */}
              <div className="absolute inset-8 rounded-full border border-primary/20 animate-float" style={{ animationDelay: '1s' }} />
              {/* Inner glow */}
              <div className="absolute inset-16 rounded-full bg-primary/5 blur-xl" />
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/40" />
              {/* Accent lines */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
