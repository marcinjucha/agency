import { Check } from 'lucide-react'
import type { BenefitsBlock } from '@agency/database'

export function Benefits({ title, items, closing }: BenefitsBlock) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
          {title}
        </h2>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {items.map((text, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-success" />
              </div>
              <p className="text-base md:text-lg text-foreground font-medium">{text}</p>
            </div>
          ))}
        </div>

        {/* Closing Statement */}
        <p className="text-lg text-muted-foreground leading-relaxed italic">
          {closing}
        </p>
      </div>
    </section>
  )
}
