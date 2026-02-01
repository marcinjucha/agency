'use client'

import { PricingCard } from './PricingCard'
import type { PricingTier } from '../types'

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    setupFee: 0,
    monthlyPrice: 29,
    maxResponses: null,
    features: [
      'Do 1 formularza intake',
      'Do 100 odpowiedzi/miesiąc',
      'Podstawowa kwalifikacja AI',
      'Wsparcie przez email',
    ],
    bestFor: 'Solo practition i małe kancelarie',
  },
  {
    id: 'professional',
    name: 'Profesjonalny',
    setupFee: 0,
    monthlyPrice: 79,
    maxResponses: null,
    features: [
      'Nieograniczone formularze intake',
      'Nieograniczone odpowiedzi',
      'Zaawansowana kwalifikacja AI',
      'Integracja Kalendarza Google',
      'Zaawansowany pulpit analityczny',
      'Wsparcie priorytetowe',
    ],
    isPopular: true,
    bestFor: 'Rosnące kancelarie (5-20 adwokatów)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    setupFee: 0,
    monthlyPrice: 0,
    maxResponses: null,
    features: [
      'Wszystko z planu Profesjonalny',
      'Dedykowany zespół integracji',
      'Spersonalizowane automatyczne przepływy pracy',
      'Umowa dotycząca dostępności 99,9%',
      'Wsparcie 24/7',
      'Pełne szkolenie zespołu',
    ],
    bestFor: 'Duże kancelarie i organizacje prawne',
  },
]

export function Pricing() {
  return (
    <section className="py-16 lg:py-24 px-4 bg-card">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-4">
            Prosty, przejrzysty cennik
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Wybierz plan, który najlepiej odpowiada potrzebom Twojej kancelarii. Zawsze możesz zmienić plan później.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isHighlighted={tier.isPopular}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 lg:mt-20 pt-12 lg:pt-16 border-t border-border">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            Częste pytania
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* FAQ Item 1 */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Czy mogę zmienić plan?
              </h4>
              <p className="text-muted-foreground text-sm">
                Tak, możesz zmienić plan w dowolnym momencie. Zmiana będzie odzwierciedlona w kolejnym cyklu rozliczeniowym.
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Czy jest okres próbny?
              </h4>
              <p className="text-muted-foreground text-sm">
                Tak, oferujemy 14-dniowy bezpłatny okres próbny dla wszystkich planów. Bez wymogu karty kredytowej.
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Jakie są warunki umowy?
              </h4>
              <p className="text-muted-foreground text-sm">
                Nie ma umów na czas określony. Możesz anulować w dowolnym momencie za pomocą paru kliknięć w ustawieniach.
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">
                Czy są dostępne rabaty roczne?
              </h4>
              <p className="text-muted-foreground text-sm">
                Tak, oferujemy 20% rabatu na płatności roczne dla wszystkich planów.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
