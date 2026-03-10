import { getTranslations } from 'next-intl/server'
import { Search, Sparkles, Cog, BarChart3 } from 'lucide-react'

const STEP_ICONS = [Search, Sparkles, Cog, BarChart3]

export async function Guarantee() {
  const t = await getTranslations('guarantee')

  const steps = [t('step1'), t('step2'), t('step3'), t('step4')]

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-8">
          {t('badge')}
        </div>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
          {t('headline')}
          <br />
          <span className="text-primary">{t('headline2')}</span>
        </h2>

        {/* Description */}
        <p className="text-lg text-muted-foreground leading-relaxed mb-12">
          {t('description')}
        </p>

        {/* 4-Step Process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {steps.map((text, i) => {
            const Icon = STEP_ICONS[i]
            return (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {i + 1}.
                  </span>
                  <p className="text-base text-foreground font-medium mt-1">{text}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Social Proof Metric */}
        <div className="border-l-4 border-primary bg-primary/5 p-6 rounded-r-xl">
          <p className="text-lg text-foreground font-medium leading-relaxed">
            {t('proof')}
          </p>
        </div>
      </div>
    </section>
  )
}
