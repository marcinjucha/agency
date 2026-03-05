/**
 * Halo Efekt Marketing - Problems Section Data
 *
 * This file contains the problems that Halo Efekt solves for Polish law firms.
 * Each problem represents a pain point that drives the need for client intake automation.
 *
 * Source: Product-Idea.md - Section 2 (Key Pain Points)
 *
 * @module apps/website/features/marketing/data/problems
 */

import type { Problem } from '../types'

/**
 * Problems array containing 6 key pain points for small law firms
 *
 * These problems highlight:
 * 1. Lead loss due to slow response time
 * 2. Wasted time gathering basic information during consultations
 * 3. Time-waster consultations that shouldn't have been scheduled
 * 4. Email/phone ping-pong for appointment booking
 * 5. Lack of follow-up automation causing lost opportunities
 * 6. Data-driven decision making gaps
 */
export const PROBLEMS: Problem[] = [
  {
    id: 'problem-1',
    icon: 'clock',
    headline: 'Przegapujesz 40-50% leadów, bo oddzwaniasz za późno',
    description:
      'Partner odpowiada na telefony, umawia spotkania, pracuje nad sprawami - brak czasu na followup. Konkurencja kradnie klientów przez lepszy response time.'
  },
  {
    id: 'problem-2',
    icon: 'hourglass',
    headline: '30 minut konsultacji to 20 min zbierania faktów',
    description:
      'Zamiast rozmawiać o strategii, spędzasz czas na pytaniach "Co się stało? Kiedy? Z kim?" Partner billing 250-400 PLN/h = 80-130 PLN stracone PER CLIENT'
  },
  {
    id: 'problem-3',
    icon: 'target',
    headline: '30-40% konsultacji to sprawy które nie powinieneś przyjąć',
    description:
      'Za małe sprawy (500-2K PLN), poza kompetencjami, zbyt skomplikowane. Każda strata 30-60 min = 1,350-1,800 PLN/miesiąc lost'
  },
  {
    id: 'problem-4',
    icon: 'messages',
    headline: 'Umawianie jednego spotkania = 3-5 email exchanges',
    description:
      'Ping-pong email\'ów: "Kiedy możemy się spotkać?" → "Sprawdzę" → "Czwartek?" → "Nie mogę". Dla 20 bookings/m = 10-16h zmarnowane'
  },
  {
    id: 'problem-5',
    icon: 'zap',
    headline: 'Leadów których nie oddzwoniłeś w 24h idą do konkurencji',
    description:
      'Brak reminders → 10-15% no-shows. Brak follow-up → klient "zastanowi się" i nigdy nie wraca. Lost: 3-5 klientów/m = 15-40K PLN'
  },
  {
    id: 'problem-6',
    icon: 'briefcase',
    headline: 'Nie wiesz skąd biorą się najlepsi klienci ani które sprawy są profitable',
    description:
      'Wszystko w głowie, decyzje "na czuja". Nie wiadomo: conversion rate? Lead sources? Revenue per case type? Trudno skalować bez dashboardu'
  }
]
