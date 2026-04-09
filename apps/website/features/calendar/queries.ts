/**
 * Calendar Data Fetching Queries
 *
 * Server-side data fetching for calendar features.
 * Uses service role client (no auth/cookies — website is public).
 *
 * Note: Google-specific getLawyerCalendarTokenPublic was removed in Iteration 4
 * of multi-provider calendar migration. Calendar connections are now resolved
 * via getConnectionForSurveyLink / getConnectionById from @agency/calendar.
 *
 * @module apps/website/features/calendar/queries
 */

// This file is intentionally minimal after the multi-provider migration.
// Calendar connection resolution now lives in packages/calendar/src/connection-manager.ts.
// If website-specific calendar queries are needed in the future, add them here.
