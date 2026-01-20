'use client'

import { Button, Card } from '@legal-mind/ui'
import { Check } from 'lucide-react'
import type { PricingTier } from '../types'

type PricingCardProps = {
  tier: PricingTier
  isHighlighted?: boolean
}

export function PricingCard({ tier, isHighlighted = false }: PricingCardProps) {
  return (
    <Card
      className={`relative flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
        isHighlighted
          ? 'ring-2 ring-primary shadow-2xl'
          : ''
      }`}
    >
      {/* Popular Badge */}
      {isHighlighted && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-bl-lg">
          Polecane
        </div>
      )}

      {/* Content Wrapper */}
      <div className="p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
            {tier.name}
          </h3>
          <p className="text-sm text-muted-foreground">{tier.bestFor}</p>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-bold text-foreground">
              {tier.monthlyPrice === 0 ? 'Dostosowana' : `€${tier.monthlyPrice}`}
            </span>
            {tier.monthlyPrice !== 0 && (
              <span className="text-muted-foreground text-lg">/miesiąc</span>
            )}
          </div>
          {tier.setupFee > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              + €{tier.setupFee} koszt konfiguracji (jednorazowo)
            </p>
          )}
        </div>

        {/* Description */}
        {tier.id === 'enterprise' && (
          <p className="text-sm text-muted-foreground mb-6">
            Niestandardowe rozwiązanie wraz z dedykowanym wsparciem
          </p>
        )}

        {/* Features List */}
        <div className="flex-1 mb-6">
          <ul className="space-y-3">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          className={`w-full ${
            isHighlighted
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : ''
          }`}
          variant={isHighlighted ? 'default' : 'secondary'}
        >
          {tier.id === 'enterprise' ? 'Skontaktuj się z nami' : 'Rozpocznij'}
        </Button>
      </div>
    </Card>
  )
}
