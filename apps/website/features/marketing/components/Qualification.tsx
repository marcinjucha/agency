import { CheckCircle, Zap } from 'lucide-react'
import type { QualificationBlock } from '@agency/database'

export function Qualification({ title, items, separator, techItem }: QualificationBlock) {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
          {title}
        </h2>

        {/* Checklist */}
        <div className="space-y-4 mb-8">
          {items.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-lg text-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Separator */}
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
          {separator}
        </p>

        {/* Tech Qualification */}
        <div className="flex items-start gap-4 p-6 rounded-xl bg-primary/5 border border-primary/10">
          <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-lg text-foreground leading-relaxed font-medium">
            {techItem}
          </p>
        </div>
      </div>
    </section>
  )
}
