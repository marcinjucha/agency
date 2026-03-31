/**
 * Source of truth for available template variables per trigger type.
 * Used by email template editor to show insertable {{variables}}.
 *
 * WHY here (lib/) and not in features/: Multiple features need this —
 * email template editor, workflow step config, and future trigger types.
 * Shared contract between triggers and email templates.
 */

export type TriggerVariable = {
  key: string
  label: string
  description: string
  category: string
  example?: string
}

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

  survey_submitted: [
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
      key: 'surveyScore',
      label: 'Wynik ankiety',
      description: 'Suma punktów z odpowiedzi',
      category: 'Ankieta',
      example: '12',
    },
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],

  booking_created: [
    {
      key: 'clientName',
      label: 'Imię klienta',
      description: 'Z rezerwacji wizyty',
      category: 'Klient',
      example: 'Jan Kowalski',
    },
    {
      key: 'bookingDate',
      label: 'Data wizyty',
      description: 'Zarezerwowana data',
      category: 'Wizyta',
      example: '2026-04-15',
    },
    {
      key: 'bookingTime',
      label: 'Godzina wizyty',
      description: 'Zarezerwowana godzina',
      category: 'Wizyta',
      example: '14:00',
    },
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
  ],

  lead_scored: [
    {
      key: 'clientName',
      label: 'Imię klienta',
      description: 'Z odpowiedzi ankiety',
      category: 'Klient',
      example: 'Jan Kowalski',
    },
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
}

/**
 * Returns available variables for a given trigger type.
 * Returns empty array for unknown types (safe fallback).
 */
export function getTriggerVariables(triggerType: string): TriggerVariable[] {
  return TRIGGER_VARIABLE_SCHEMAS[triggerType] ?? []
}
