import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'

export async function FinalCTA() {
  const t = await getTranslations('cta')

  return (
    <section
      id="contact"
      className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary to-primary/90 relative overflow-hidden"
      aria-label="Sekcja kontaktowa"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-foreground rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
          {t('headline')}
        </h2>

        {/* Description */}
        <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('description')}
        </p>

        {/* CTA Button */}
        <a
          href="#contact"
          className="inline-flex items-center gap-3 bg-background text-foreground hover:bg-background/90 rounded-full px-10 py-5 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 group"
        >
          {t('button')}
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </a>

        {/* Subtext */}
        <p className="text-primary-foreground/70 text-sm md:text-base mt-8">
          {t('subtext')}
        </p>
      </div>
    </section>
  )
}
