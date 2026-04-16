/**
 * Centralized query key registry for TanStack Query.
 *
 * Why: Eliminates scattered inline string arrays across routes,
 * making cache invalidation predictable and typo-proof.
 */
export const queryKeys = {
  landing: {
    all: ['landing-page'] as const,
  },
  blog: {
    all: ['blog-posts'] as const,
    detail: (slug: string) => ['blog-post', slug] as const,
    preview: (token: string) => ['blog-preview', token] as const,
  },
  survey: {
    byToken: (token: string) => ['survey', token] as const,
    calendarStatus: (linkId: string) => ['survey-calendar-status', linkId] as const,
  },
  calendar: {
    slots: (linkId: string, date: string) => ['calendar-slots', linkId, date] as const,
  },
}
