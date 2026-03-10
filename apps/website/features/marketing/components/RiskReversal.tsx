import { getTranslations } from 'next-intl/server'
import { Shield } from 'lucide-react'

export async function RiskReversal() {
  const t = await getTranslations('riskReversal')

  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {t('title')}
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-12">
          {/* Step 1 */}
          <div className="relative pl-8 border-l-2 border-primary/30">
            <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              1
            </div>
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
              {t('step1Label')}
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              {t('step1Text')}
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative pl-8 border-l-2 border-primary/30">
            <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
              {t('step2Label')}
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              {t('step2Text')}
            </p>
          </div>
        </div>

        {/* Closing Statements */}
        <div className="bg-background rounded-xl p-6 md:p-8 space-y-4">
          <p className="text-lg text-foreground leading-relaxed">
            {t('closing')}
          </p>
          <p className="text-xl font-bold text-foreground">
            {t('bold')}
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('transparency')}
          </p>
        </div>
      </div>
    </section>
  )
}
