/**
 * Canonical trigger payload shapes for the workflow engine.
 *
 * WHY in @agency/validators (not in apps/cms/features/workflows/engine/types.ts):
 * Both apps need this type:
 *   - apps/cms: engine/types.ts uses it to build the discriminated union
 *   - apps/cms: lib/trigger-schemas.ts uses it as a compile-time guard
 *   - apps/website: features/calendar/booking.ts uses it to type the dispatched payload
 * Direct cross-app imports are forbidden by ADR-005 (CMS ↔ Website via Supabase only).
 * @agency/validators is the correct neutral package for cross-app type contracts.
 */

export type BookingCreatedPayload = {
  appointmentId: string
  responseId: string
  surveyLinkId: string
}

export type SurveySubmittedPayload = {
  responseId: string
  surveyLinkId: string
}
