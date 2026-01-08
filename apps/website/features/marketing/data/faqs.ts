/**
 * FAQ Data for Legal Hub Landing Page
 *
 * Contains 8 frequently asked questions addressing common objections
 * from the Product-Idea.md objection handling section.
 *
 * These FAQs are displayed on the landing page to address customer concerns
 * about cost, security, AI accuracy, existing tools, and implementation.
 *
 * @module apps/website/features/marketing/data/faqs
 */

import type { FAQ } from '../types'

/**
 * Array of frequently asked questions with answers
 * Each FAQ addresses a specific customer objection
 */
export const FAQS: FAQ[] = [
  {
    id: 'faq-1',
    question: 'Klienci wolą dzwonić, nie wypełniać formularze online',
    answer:
      'To świetna obserwacja. Legal Hub nie zastępuje telefonu - uzupełnia go. W praktyce: 60-70% klientów WOLI formularze (mogą wypełnić o 22:00), 30-40% nadal dzwoni - i to OK! Przykład: litigation firm Warszawa → 20 leadów/m → 35 leadów/m (+75%) po Legal Hub. Dodatkowy kanał = więcej klientów.'
  },
  {
    id: 'faq-2',
    question: 'AI może źle ocenić sprawę - prawnik musi zobaczyć osobiście',
    answer:
      'Absolutnie się zgadzam - AI nie zastępuje prawnika, tylko pomaga PRE-SCREEN. Ty wciąż masz pełną kontrolę. AI pokazuje insights (case type, urgency, value, risk flags), TY decydujesz czy umówić. Benefit: zamiast 30 min consultation żeby zrozumieć basic facts, czytasz 5-min summary i robisz decyzję.'
  },
  {
    id: 'faq-3',
    question: 'Mamy już Calendly lub inny system do umawiania spotkań',
    answer:
      'Świetnie! Calendly to dobre narzędzie. Legal Hub robi więcej niż booking - to complete intake system. Calendly = booking, Legal Hub = Calendly + TypeForm + AI Qualification + CMS w jednym. Jeśli już masz Calendly, Legal Hub go uzupełnia i zmienia Twój workflow.'
  },
  {
    id: 'faq-4',
    question: 'To brzmi drogo jak na formularze i kalendarz',
    answer:
      'Rozumiem obawy o koszt. Spójrzmy na ROI: Tier 1 = 6,300 PLN/rok. Savings Year 1: +576K PLN (more clients) + 52.8K PLN (time saved) = 628.8K PLN value. ROI: 100:1. Break-even: po 2-3 nowych klientach.'
  },
  {
    id: 'faq-5',
    question: 'Jak bezpieczne są dane klientów?',
    answer:
      'Bezpieczeństwo jest prioritetem. Wszystkie dane w Supabase (certified security, GDPR compliant). Encryption in transit + at rest. Row-level security policies ensure klienci widzą tylko swoje dane. Your data is yours - możliwy export anytime.'
  },
  {
    id: 'faq-6',
    question: 'Jaki jest minimalny commitment?',
    answer:
      'Elastyczne: monthly lub annual billing (15% discount roczny). Możesz upgradować/downgradować plan anytime. 30-day money-back guarantee - jeśli nie zadowolony, zwrot pełnej kwoty.'
  },
  {
    id: 'faq-7',
    question: 'Jak szybko mogę zacząć?',
    answer:
      'Instalacja: 15 minut. Onboarding call: 30 minut. Pierwszy lead via Legal Hub: ten sam dzień. Setup fee covers: customization, integration, training.'
  },
  {
    id: 'faq-8',
    question: 'Jakie są next steps po implementacji?',
    answer:
      '1. Customize intake forms dla Twojej specjalizacji. 2. Share link z klientami (email, website, Google Ads). 3. Monitor responses w CMS dashboard. 4. AI pokazuje insights, Ty decydujesz. 5. Clients book themselves. Wszystko tracked w jednym miejscu.'
  }
]
