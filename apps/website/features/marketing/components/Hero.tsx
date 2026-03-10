import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'

export async function Hero() {
  const t = await getTranslations('hero')

  const qualifiers = [
    t('qualifier1'),
    t('qualifier2'),
    t('qualifier3'),
    t('qualifier4'),
  ]

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 lg:pb-36 bg-background overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Banner */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 mb-12 md:mb-16">
          <div>
            <p className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
              {t('metric1Value')}
            </p>
            <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              {t('metric1Label')}
            </p>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              {t('metric2Value')}
            </p>
            <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              {t('metric2Label')}
            </p>
          </div>
        </div>

        {/* Qualifier Statements */}
        <div className="space-y-2 mb-8">
          {qualifiers.map((text, i) => (
            <p key={i} className="text-lg md:text-xl text-foreground font-medium leading-relaxed">
              {text}
            </p>
          ))}
        </div>

        {/* Bad News / Good News Hook */}
        <div className="mb-10 space-y-4">
          <p className="text-lg text-muted-foreground">
            {t('badNews')}
          </p>
          <p className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
            {t('goodNews')}
          </p>
        </div>

        {/* Value Proposition */}
        <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
          {t('valueProp')}
        </p>

        {/* Risk-Free Guarantee */}
        <p className="text-base text-muted-foreground leading-relaxed mb-10 border-l-4 border-primary pl-4">
          {t('guarantee')}
        </p>

        {/* CTA */}
        <a
          href="#contact"
          className="inline-flex items-center gap-3 bg-foreground text-background hover:bg-foreground/90 rounded-full px-10 py-5 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 group"
        >
          {t('cta')}
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  )
}
