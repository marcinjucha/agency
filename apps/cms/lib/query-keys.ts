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
    aiActionResults: (id: string) => ['response', id, 'ai-action-results'] as const,
  },
  appointments: {
    all: ['appointments'] as const,
  },
  landing: {
    all: ['landing-page'] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    connections: ['calendar', 'connections'] as const,
    settings: ['calendar', 'settings'] as const,
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
  users: {
    all: ['users'] as const,
    list: (tenantId?: string | null) =>
      tenantId ? (['users', 'list', tenantId] as const) : (['users'] as const),
    detail: (id: string) => ['users', id] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: (tenantId?: string | null) =>
      tenantId ? (['roles', 'list', tenantId] as const) : (['roles'] as const),
    detail: (id: string) => ['roles', id] as const,
  },
  tenants: {
    all: ['tenants'] as const,
    detail: (id: string) => ['tenants', id] as const,
  },
  marketplace: {
    all: ['marketplace'] as const,
    connections: ['marketplace', 'connections'] as const,
    connection: (id: string) => ['marketplace', 'connections', id] as const,
    listings: (productId: string) => ['marketplace', 'listings', productId] as const,
    listingsByProducts: (productIds: string[]) => ['marketplace', 'listings-by-products', productIds.slice().sort().join(',')] as const,
    listingsByConnection: (connectionId: string) => ['marketplace', 'listings-by-connection', connectionId] as const,
    imports: (connectionId: string) => ['marketplace', 'imports', connectionId] as const,
    categories: (connectionId: string) => ['marketplace', 'categories', connectionId] as const,
    importProgress: (importId: string) => ['marketplace', 'import-progress', importId] as const,
  },
  docforgeLicenses: {
    all: ['docforge-licenses'] as const,
    detail: (id: string) => ['docforge-licenses', 'detail', id] as const,
    activations: (licenseId: string) => ['docforge-licenses', 'activations', licenseId] as const,
  },
  email: {
    all: ['email-templates'] as const,
    templates: ['email-templates', 'list'] as const,
    template: (type: string) => ['email-templates', 'detail', type] as const,
  },
  blog: {
    all: ['blog-posts'] as const,
    list: ['blog-posts', 'list'] as const,
    detail: (id: string) => ['blog-posts', 'detail', id] as const,
    categories: ['blog-posts', 'categories'] as const,
  },
} as const
