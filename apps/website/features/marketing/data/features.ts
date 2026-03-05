/**
 * Halo Efekt Features Data
 *
 * Static data for the Features section on the marketing website.
 * Contains 6 core features that power the Halo Efekt intake automation platform.
 *
 * @module apps/website/features/marketing/data/features
 */

import type { Feature } from '../types'

/**
 * FEATURES array - 6 core capabilities of Halo Efekt
 *
 * Features are displayed on the marketing homepage to communicate
 * the platform's key functionality to prospective law firms.
 *
 * @example
 * FEATURES[0] = {
 *   id: 'feature-smart-intake-forms',
 *   icon: 'document',
 *   name: 'Smart Intake Forms',
 *   description: '...',
 *   isComingSoon: false
 * }
 */
export const FEATURES: Feature[] = [
  {
    id: 'feature-smart-intake-forms',
    icon: 'document',
    name: 'Smart Intake Forms',
    description:
      'Create custom forms without coding. 7 field types, conditional logic (If case type = divorce → ask about children), multi-step forms.',
    isComingSoon: false,
  },
  {
    id: 'feature-shareable-public-links',
    icon: 'zap',
    name: 'Shareable Public Links',
    description:
      'Clients receive unique links like haloefekt.pl/survey/abc123. Anonymous access, client-side validation, mobile-responsive, auto-save drafts.',
    isComingSoon: false,
  },
  {
    id: 'feature-ai-powered-analysis',
    icon: 'shield',
    name: 'AI-Powered Case Qualification',
    description:
      'Webhook triggered on submission → AI analyzes case type, urgency (1-10), value estimate, risk flags, and recommends next steps.',
    isComingSoon: false,
  },
  {
    id: 'feature-google-calendar-integration',
    icon: 'target',
    name: 'Automatic Calendar Booking',
    description:
      'Clients see your available slots (9 AM - 5 PM, 15-min buffer), pick a time, and auto-create appointments. Zero manual booking.',
    isComingSoon: false,
  },
  {
    id: 'feature-response-management-dashboard',
    icon: 'briefcase',
    name: 'CMS Dashboard',
    description:
      'All responses in one place. Filter by survey/status/date, search by email/name, add internal notes, export to PDF, track status.',
    isComingSoon: false,
  },
  {
    id: 'feature-email-automations',
    icon: 'check',
    name: 'Email Automations',
    description:
      'Phase 2: Automated notifications for form confirmation, booking confirmation, and daily digest. n8n workflows, email templates.',
    isComingSoon: true,
  },
]
