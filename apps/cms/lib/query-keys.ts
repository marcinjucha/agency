/**
 * Centralized query key registry for TanStack Query.
 *
 * Why: Eliminates scattered inline string arrays across features,
 * making cache invalidation predictable and typo-proof.
 *
 * Note: blogKeys and mediaKeys live in their own queries.ts files
 * (already have key factories). siteSettingsKeys lives in its own types.ts.
 */
export const queryKeys = {
  surveys: {
    all: ['surveys'] as const,
    links: (surveyId: string) => ['survey-links', surveyId] as const,
  },
  intake: {
    all: ['intake'] as const,
    pipeline: ['intake', 'pipeline'] as const,
    stats: ['intake', 'stats'] as const,
    appointments: ['intake', 'appointments'] as const,
  },
  responses: {
    all: ['responses'] as const,
    detail: (id: string) => ['response', id] as const,
  },
  appointments: {
    all: ['appointments'] as const,
  },
  landing: {
    all: ['landing-page'] as const,
  },
  calendar: {
    settings: ['calendarSettings'] as const,
  },
} as const
