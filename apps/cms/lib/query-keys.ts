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
  shopProducts: {
    all: ['shop-products'] as const,
    list: ['shop-products', 'list'] as const,
    detail: (id: string) => ['shop-products', 'detail', id] as const,
  },
  shopCategories: {
    all: ['shop-categories'] as const,
    list: ['shop-categories', 'list'] as const,
    detail: (id: string) => ['shop-categories', 'detail', id] as const,
  },
  workflows: {
    all: ['workflows'] as const,
    list: ['workflows', 'list'] as const,
    detail: (id: string) => ['workflows', 'detail', id] as const,
    executions: (workflowId: string) => ['workflows', 'executions', workflowId] as const,
    emailTemplates: ['workflows', 'email-templates'] as const,
    surveys: ['workflows', 'surveys'] as const,
  },
  executions: {
    all: (filters?: { workflowId?: string; status?: string }) =>
      filters ? (['executions', filters] as const) : (['executions'] as const),
    detail: (id: string) => ['executions', 'detail', id] as const,
  },
  marketplace: {
    all: ['marketplace'] as const,
    connections: ['marketplace', 'connections'] as const,
    connection: (id: string) => ['marketplace', 'connections', id] as const,
    listings: (productId: string) => ['marketplace', 'listings', productId] as const,
    listingsByConnection: (connectionId: string) => ['marketplace', 'listings-by-connection', connectionId] as const,
    imports: (connectionId: string) => ['marketplace', 'imports', connectionId] as const,
    categories: (connectionId: string) => ['marketplace', 'categories', connectionId] as const,
  },
} as const
