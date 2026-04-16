/**
 * Centralized query key registry for TanStack Query.
 *
 * Why: Eliminates scattered inline string arrays across routes,
 * making cache invalidation predictable and typo-proof.
 *
 * Website data-fetching pattern: routes use createServerFn in loaders + Route.useLoaderData().
 * TanStack Query (ensureQueryData + useLoaderData) used only for blog routes — see blog group below.
 * Survey and calendar keys are defined here for consistency but currently not used via queryKeys.*
 * (components inline their own key arrays).
 */
export const queryKeys = {
  /**
   * @source getPublicLandingPageFn (features/marketing/server.ts)
   * @usedBy app/routes/__root.tsx (loader: ensureQueryData → useLoaderData)
   * @staleTime 1h (set per-query in __root.tsx loader, aligned with CACHE_STATIC s-maxage=3600)
   * @invalidatedBy zmiana landing page w CMS (brak auto-invalidacji — ISR/TTL)
   */
  landing: {
    all: ['landing-page'] as const,
  },

  /**
   * @source getPublishedBlogPostsFn (features/blog/server.ts) — for list
   * @source getPublishedBlogPostFn (features/blog/server.ts) — for detail
   * @source getBlogPostByPreviewTokenFn (features/blog/server.ts) — for preview
   * @usedBy app/routes/blog/index.tsx (loader: ensureQueryData → useLoaderData)
   * @usedBy app/routes/blog/$slug.tsx (loader: ensureQueryData → useLoaderData)
   * @usedBy app/routes/blog/preview.$token.tsx (loader: getPublishedBlogPostFn directly → useLoaderData)
   * @staleTime 5min (global default in app/router.tsx — blog data refreshes on next navigation)
   * @invalidatedBy zmiana posta w CMS (brak auto-invalidacji — ISR/TTL)
   */
  blog: {
    all: ['blog-posts'] as const,
    detail: (slug: string) => ['blog-post', slug] as const,
    preview: (token: string) => ['blog-preview', token] as const,
  },

  /**
   * @source getSurveyByTokenFn, getSurveyLinkCalendarStatusFn (features/survey/server.ts)
   * @usedBy TODO: nie znaleziono użycia via queryKeys.survey — komponenty używają inline key arrays
   * @invalidatedBy brak (survey data jest read-only na website)
   */
  survey: {
    byToken: (token: string) => ['survey', token] as const,
    calendarStatus: (linkId: string) => ['survey-calendar-status', linkId] as const,
  },

  /**
   * @source getAvailableSlotsFn (features/calendar/server.ts)
   * @usedBy TODO: nie znaleziono użycia via queryKeys.calendar — komponenty używają inline key arrays
   * @staleTime krótki (sloty zmieniają się przy każdej rezerwacji — brak długiego cache)
   * @invalidatedBy brak (rezerwacja tworzy nową odpowiedź, nie invaliduje slotów explicite)
   */
  calendar: {
    slots: (linkId: string, date: string) => ['calendar-slots', linkId, date] as const,
  },
}
