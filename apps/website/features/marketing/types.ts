/**
 * Marketing Feature Type Definitions
 *
 * Foundation types for the Halo Efekt landing page.
 * All marketing components, data files, and queries import from this file.
 *
 * Contains interfaces for:
 * - Problems section
 * - Benefits section
 * - Features section
 * - How It Works section
 * - Pricing tiers
 * - Testimonials
 * - FAQ items
 *
 * @module apps/website/features/marketing/types
 */

/**
 * Icon names available across the site
 * Used to ensure consistency and type safety for icon references
 */
export type IconName =
  | 'document'
  | 'clock'
  | 'users'
  | 'zap'
  | 'shield'
  | 'target'
  | 'check'
  | 'chevron'
  | 'star'
  | 'heart'
  | 'scale'
  | 'briefcase'
  | 'hourglass'
  | 'messages'

/**
 * Practice areas for legal services
 * Used in testimonials and service descriptions
 */
export type PracticeArea =
  | 'prawo-rodzinne'
  | 'prawo-pracy'
  | 'prawo-handlowe'
  | 'prawo-nieruchomości'
  | 'prawo-spadkowe'
  | 'prawo-umów'
  | 'odszkodowania'

/**
 * Problem interface for Problems section
 *
 * Represents a specific legal problem or pain point that the service solves
 *
 * @example
 * {
 *   id: 'problem-1',
 *   icon: 'document',
 *   headline: 'Zbyt wiele ręcznej pracy dokumentacyjnej',
 *   description: 'Tradycyjne wypełnianie formularzy zajmuje zbyt dużo czasu...'
 * }
 */
export interface Problem {
  /** Unique identifier */
  id: string

  /** Icon name from IconName type */
  icon: IconName

  /** Short headline describing the problem */
  headline: string

  /** Longer description explaining the problem in detail */
  description: string
}

/**
 * Benefit interface for Benefits section
 *
 * Represents a measurable benefit or advantage of using the service
 *
 * @example
 * {
 *   id: 'benefit-1',
 *   metric: '5 dni → 15 minut',
 *   headline: 'Skrócony czas wstępnej kwalifikacji',
 *   explanation: 'AI automatycznie analizuje odpowiedzi klientów...',
 *   subtext: 'Skup się na najważniejszych sprawach',
 *   icon: 'zap'
 * }
 */
export interface Benefit {
  /** Unique identifier */
  id: string

  /** Metric showing improvement (e.g., "5 dni → 15 minut") */
  metric: string

  /** Main headline for the benefit */
  headline: string

  /** Explanation of how the benefit works */
  explanation: string

  /** Additional supporting text or call to action */
  subtext: string

  /** Icon name from IconName type */
  icon: IconName
}

/**
 * Feature interface for Features section
 *
 * Represents a specific feature or capability of the platform
 *
 * @example
 * {
 *   id: 'feature-1',
 *   icon: 'shield',
 *   name: 'Bezpieczne przechowywanie danych',
 *   description: 'Wszystkie dane są szyfrowane end-to-end...',
 *   isComingSoon: false
 * }
 */
export interface Feature {
  /** Unique identifier */
  id: string

  /** Icon name from IconName type */
  icon: IconName

  /** Short feature name */
  name: string

  /** Detailed description of the feature */
  description: string

  /** Whether this feature is coming soon (optional) */
  isComingSoon?: boolean
}

/**
 * Step interface for How It Works section
 *
 * Represents a step in the workflow or process
 *
 * @example
 * {
 *   id: 'step-1',
 *   number: 1,
 *   title: 'Wyślij link do klienta',
 *   description: 'Skopiuj wygenerowany link i wyślij go klientowi...'
 * }
 */
export interface Step {
  /** Unique identifier */
  id: string

  /** Step number (1-based) */
  number: number

  /** Title of the step */
  title: string

  /** Description explaining what happens in this step */
  description: string
}

/**
 * PricingTier interface for Pricing section
 *
 * Represents a subscription tier or pricing plan
 *
 * @example
 * {
 *   id: 'starter',
 *   name: 'Starter',
 *   setupFee: 0,
 *   monthlyPrice: 299,
 *   maxResponses: 50,
 *   features: [
 *     'Unlimited surveys',
 *     'Basic analytics',
 *     'Email support'
 *   ],
 *   isPopular: false,
 *   bestFor: 'Solo practitioners and small practices'
 * }
 */
export interface PricingTier {
  /** Unique identifier (e.g., 'starter', 'professional', 'enterprise') */
  id: string

  /** Display name of the pricing tier */
  name: string

  /** One-time setup fee in PLN (0 if no setup fee) */
  setupFee: number

  /** Monthly subscription price in PLN */
  monthlyPrice: number

  /** Maximum number of survey responses per month (null = unlimited) */
  maxResponses: number | null

  /** List of features included in this tier */
  features: string[]

  /** Whether this is the recommended/popular tier (optional) */
  isPopular?: boolean

  /** Description of who this tier is best for */
  bestFor: string
}

/**
 * Testimonial interface for Testimonials section
 *
 * Represents a customer testimonial or review
 *
 * @example
 * {
 *   id: 'testimonial-1',
 *   quote: 'Ta platforma zmienia sposób, w jaki pracuję z klientami...',
 *   author: 'Jan Kowalski',
 *   company: 'Kancelaria Kowalski & Partnerzy',
 *   city: 'Warszawa',
 *   practiceArea: 'prawo-rodzinne',
 *   metrics: 'Zaoszczędzam 10 godzin tygodniowo',
 *   image: '/testimonials/jan-kowalski.jpg'
 * }
 */
export interface Testimonial {
  /** Unique identifier */
  id: string

  /** The testimonial quote text */
  quote: string

  /** Author's full name */
  author: string

  /** Author's law firm or organization (optional) */
  company?: string

  /** Author's city/location */
  city: string

  /** Author's primary practice area */
  practiceArea: PracticeArea

  /** Metrics or results achieved (optional) */
  metrics?: string

  /** Path to author's profile/avatar image (optional) */
  image?: string
}

/**
 * FAQ interface for FAQ section
 *
 * Represents a frequently asked question with its answer
 *
 * @example
 * {
 *   id: 'faq-1',
 *   question: 'Czy mogę używać platform do obsługi wielu kancelarii?',
 *   answer: 'Tak, platforma obsługuje wiele niezależnych kancelarii...'
 * }
 */
export interface FAQ {
  /** Unique identifier */
  id: string

  /** The frequently asked question */
  question: string

  /** The answer to the question (can include markdown) */
  answer: string
}

/**
 * Marketing Page Data interface
 *
 * Aggregates all sections of the marketing page
 * Used when loading all marketing content at once
 */
export interface MarketingPageData {
  /** Problems section */
  problems: Problem[]

  /** Benefits section */
  benefits: Benefit[]

  /** Features section */
  features: Feature[]

  /** How It Works section */
  steps: Step[]

  /** Pricing section */
  pricingTiers: PricingTier[]

  /** Testimonials section */
  testimonials: Testimonial[]

  /** FAQ section */
  faqs: FAQ[]
}
