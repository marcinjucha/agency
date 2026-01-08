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
      className={`relative flex flex-col h-full overflow-hidden transition-all duration-300 ${
        isHighlighted
          ? 'ring-2 ring-blue-500 shadow-2xl scale-105 lg:scale-110'
          : 'hover:shadow-lg'
      }`}
    >
      {/* Popular Badge */}
      {isHighlighted && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-sm font-semibold rounded-bl-lg">
          Polecane
        </div>
      )}

      {/* Content Wrapper */}
      <div className="p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
            {tier.name}
          </h3>
          <p className="text-sm text-gray-600">{tier.bestFor}</p>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-bold text-gray-900">
              {tier.monthlyPrice === 0 ? 'Dostosowana' : `€${tier.monthlyPrice}`}
            </span>
            {tier.monthlyPrice !== 0 && (
              <span className="text-gray-600 text-lg">/miesiąc</span>
            )}
          </div>
          {tier.setupFee > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              + €{tier.setupFee} koszt konfiguracji (jednorazowo)
            </p>
          )}
        </div>

        {/* Description */}
        {tier.id === 'enterprise' && (
          <p className="text-sm text-gray-600 mb-6">
            Niestandardowe rozwiązanie wraz z dedykowanym wsparciem
          </p>
        )}

        {/* Features List */}
        <div className="flex-1 mb-6">
          <ul className="space-y-3">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          className={`w-full ${
            isHighlighted
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          {tier.id === 'enterprise' ? 'Skontaktuj się z nami' : 'Rozpocznij'}
        </Button>
      </div>
    </Card>
  )
}
