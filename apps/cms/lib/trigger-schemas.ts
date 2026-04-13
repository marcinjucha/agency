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
      key: 'respondentName',
      label: 'Imię respondenta',
      description: 'Imię podane w ankiecie (jeśli dostępne)',
      category: 'Klient',
      example: 'Jan Kowalski',
    },
    {
      key: 'clientEmail',
      label: 'Email klienta',
      description: 'Email z linku ankiety (notification_email lub client_email)',
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
      key: 'qaContext',
      label: 'Treść ankiety (Q&A)',
      description: 'Pełna treść pytań i odpowiedzi — idealne do promptów AI',
      category: 'Ankieta',
      example: 'Q: Jaka jest Twoja branża?\nA: IT\n\nQ: Ile osób zatrudniasz?\nA: 50',
    },
    {
      key: 'submittedAt',
      label: 'Data wypełnienia',
      description: 'Kiedy ankieta została wypełniona',
      category: 'Ankieta',
      example: '2026-04-12T10:30:00Z',
    },
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
    {
      key: 'companyName',
      label: 'Nazwa firmy',
      description: 'Z profilu organizacji',
      category: 'Firma',
      example: 'Halo Efekt',
    },
    {
      key: 'answers',
      label: 'Odpowiedzi na pytania (JSON)',
      description: 'Tablica odpowiedzi: [{questionText, answer, questionType}]',
      category: 'Ankieta',
      example: '[{"questionText": "Imię", "answer": "Jan Kowalski", "questionType": "text"}]',
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
      key: 'clientEmail',
      label: 'Email klienta',
      description: 'Z rezerwacji wizyty',
      category: 'Klient',
      example: 'jan@firma.pl',
    },
    {
      key: 'appointmentAt',
      label: 'Data i godzina wizyty',
      description: 'Pełna data i czas rezerwacji (ISO 8601)',
      category: 'Wizyta',
      example: '2026-04-15T14:00:00Z',
    },
    {
      key: 'notes',
      label: 'Notatki do wizyty',
      description: 'Dodatkowe uwagi klienta (jeśli podane)',
      category: 'Wizyta',
      example: 'Proszę o kontakt telefoniczny przed wizytą',
    },
    {
      key: 'appointmentId',
      label: 'ID wizyty',
      description: 'UUID wizyty w bazie danych',
      category: 'System',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
}

/**
 * Returns available variables for a given trigger type.
 * Returns empty array for unknown types (safe fallback).
 */
export function getTriggerVariables(triggerType: string): TriggerVariable[] {
  return TRIGGER_VARIABLE_SCHEMAS[triggerType] ?? []
}
