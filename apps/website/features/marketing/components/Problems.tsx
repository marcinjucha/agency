import { getTranslations } from 'next-intl/server'
import { FileSpreadsheet, Mail, RefreshCw, UserX } from 'lucide-react'

const PROBLEM_ICONS = [RefreshCw, FileSpreadsheet, Mail, UserX]

export async function Problems() {
  const t = await getTranslations('problems')

  const items = [t('item1'), t('item2'), t('item3'), t('item4')]

  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          {t('title')}
        </h2>

        {/* Opening Stat */}
        <p className="text-xl text-foreground font-medium leading-relaxed mb-10">
          {t('stat')}
        </p>

        {/* Pain Points List */}
        <div className="space-y-4 mb-10">
          {items.map((text, i) => {
            const Icon = PROBLEM_ICONS[i]
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mt-0.5">
                  <Icon className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-lg text-foreground">{text}</p>
              </div>
            )
          })}
        </div>

        {/* Framing */}
        <p className="text-lg text-foreground font-medium leading-relaxed mb-6">
          {t('framing')}
        </p>

        {/* Closing Hook */}
        <p className="text-xl text-muted-foreground italic leading-relaxed">
          {t('hook')}
        </p>
      </div>
    </section>
  )
}
