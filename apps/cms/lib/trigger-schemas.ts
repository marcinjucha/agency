/**
 * Source of truth for available template variables per trigger type.
 * Used by email template editor to show insertable {{variables}}.
 *
 * WHY here (lib/) and not in features/: Multiple features need this —
 * email template editor, workflow step config, and future trigger types.
 * Shared contract between triggers and email templates.
 */

import type { BookingCreatedPayload, SurveySubmittedPayload } from '@agency/validators'

export type TriggerVariable = {
  key: string
  label: string
  description: string
  category: string
  example?: string
}

// ---------------------------------------------------------------------------
// Typed schema entries for payload-backed trigger types
//
// WHY: `satisfies` checks that every `key` in these arrays is a valid key of
// the corresponding canonical payload type from @agency/validators. This is the
// compile-time bridge — rename or remove a payload field → TS error here.
//
// The type is `Array<Omit<TriggerVariable, 'key'> & { key: keyof P & string }>`.
// `satisfies` checks conformance without widening the literal array — so keys
// that aren't on the payload type cause a TS error at the literal, not at a
// later call site.
//
// Zero runtime overhead — `satisfies` is a type-only operator, erased from JS.
// ---------------------------------------------------------------------------

const bookingCreatedSchema = [
  {
    key: 'appointmentId',
    label: 'ID wizyty',
    description: 'UUID wizyty w bazie danych',
    category: 'System',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
  {
    key: 'responseId',
    label: 'ID odpowiedzi',
    description: 'UUID odpowiedzi powiązanej z wizytą',
    category: 'System',
    example: '2584aca8-6f61-4504-84fb-378b67150eb0',
  },
  {
    key: 'surveyLinkId',
    label: 'ID linku ankiety',
    description: 'UUID linku ankiety, z którego pochodzi rezerwacja',
    category: 'System',
    example: '01c54fc5-f6b0-422e-abb2-72d85b145f5e',
  },
] satisfies Array<Omit<TriggerVariable, 'key'> & { key: keyof BookingCreatedPayload & string }>

const surveySubmittedSchema = [
  {
    key: 'responseId',
    label: 'ID odpowiedzi',
    description: 'UUID odpowiedzi w bazie danych',
    category: 'System',
    example: '2584aca8-6f61-4504-84fb-378b67150eb0',
  },
  {
    key: 'surveyLinkId',
    label: 'ID linku ankiety',
    description: 'UUID linku ankiety',
    category: 'System',
    example: '01c54fc5-f6b0-422e-abb2-72d85b145f5e',
  },
] satisfies Array<Omit<TriggerVariable, 'key'> & { key: keyof SurveySubmittedPayload & string }>

export const TRIGGER_VARIABLE_SCHEMAS: Record<string, TriggerVariable[]> = {
  form_confirmation: [
    {
      key: 'clientName',
      label: 'Imię klienta',
      description: 'Z odpowiedzi ankiety',
      category: 'Klient',
      example: 'Jan Kowalski',
    },
    {
      key: 'clientEmail',
      label: 'Email klienta',
      description: 'Z odpowiedzi ankiety',
      category: 'Klient',
      example: 'jan@firma.pl',
    },
    {
      key: 'surveyTitle',
      label: 'Tytuł ankiety',
      description: 'Nazwa ankiety z CMS',
      category: 'Ankieta',
      example: 'Formularz kontaktowy',
    },
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],

  /**
   * survey_submitted trigger exposes only IDs.
   * WHY: All hydrated survey data (answers, surveyTitle, clientEmail, etc.) is now fetched
   * by the get_response step, not the trigger. This decouples trigger from data fetching
   * and avoids connection-pool timing issues (trigger fires 500ms after DB insert).
   * Workflow authors must add a get_response step to access survey data.
   */
  survey_submitted: surveySubmittedSchema,

  /**
   * booking_created trigger exposes only IDs.
   * WHY: All hydrated appointment data (clientEmail, appointmentAt, clientName, notes)
   * must be fetched by an explicit get_appointment step (added in Commit 8). This decouples
   * trigger from data fetching, mirroring survey_submitted, and gives visual clarity on the
   * canvas — every data dependency is a step, not an implicit trigger field.
   */
  booking_created: bookingCreatedSchema,

  lead_scored: [
    {
      key: 'overallScore',
      label: 'Wynik ogólny',
      description: 'Wynik kwalifikacji AI (0-10)',
      category: 'Kwalifikacja',
      example: '8.5',
    },
    {
      key: 'recommendation',
      label: 'Rekomendacja',
      description: 'Wynik kwalifikacji: QUALIFIED / DISQUALIFIED / NEEDS_MORE_INFO',
      category: 'Kwalifikacja',
      example: 'QUALIFIED',
    },
    {
      key: 'summary',
      label: 'Podsumowanie AI',
      description: 'Tekstowe podsumowanie kwalifikacji od AI',
      category: 'Kwalifikacja',
      example: 'Klient z branży IT, 50 pracowników, pilna potrzeba automatyzacji',
    },
    {
      key: 'responseId',
      label: 'ID odpowiedzi',
      description: 'UUID odpowiedzi (jeśli dotyczy ankiety)',
      category: 'System',
      example: '2584aca8-6f61-4504-84fb-378b67150eb0',
    },
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],

  manual: [
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],

  scheduled: [
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],
}

/**
 * Returns available variables for a given trigger type.
 * Returns empty array for unknown types (safe fallback).
 */
export function getTriggerVariables(triggerType: string): TriggerVariable[] {
  return TRIGGER_VARIABLE_SCHEMAS[triggerType] ?? []
}
