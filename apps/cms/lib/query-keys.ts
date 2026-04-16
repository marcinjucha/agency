/**
 * Centralized query key registry for TanStack Query.
 *
 * Why: Eliminates scattered inline string arrays across features,
 * making cache invalidation predictable and typo-proof.
 *
 * Note: blogKeys and mediaKeys live in their own queries.ts files
 * (already have key factories). siteSettingsKeys lives in its own types.ts.
 * The blog group below duplicates blogKeys for components that import from query-keys.ts.
 */
export const queryKeys = {
  /**
   * @source getSurveysFn, getSurveyLinksFn (features/surveys/server.ts)
   * @usedBy SurveyList, SurveyLinks, SurveyLinkCalendarSelect
   * @invalidatedBy NewSurveyForm (create), SurveyList (delete), SurveyBuilder (save/delete),
   *   SurveyLinks (link create/update/delete/toggle), SurveyLinkCalendarSelect (calendar link)
   */
  surveys: {
    all: ['surveys'] as const,
    links: (surveyId: string) => ['survey-links', surveyId] as const,
  },

  /**
   * @source getIntakePipelineFn, getIntakeStatsFn, getIntakeAppointmentsFn (features/intake/server.ts)
   * @usedBy IntakeHub (pipeline), StatsBar (stats), AppointmentsTable (appointments)
   * @invalidatedBy SurveyList (delete survey), SurveyBuilder (survey save/delete),
   *   ResponsesTable (delete response), AppointmentsTable (cancel), ResponseDetailPanel (status/stage change)
   */
  intake: {
    all: ['intake'] as const,
    pipeline: ['intake', 'pipeline'] as const,
    stats: ['intake', 'stats'] as const,
    appointments: ['intake', 'appointments'] as const,
  },

  /**
   * @source getResponsesFn, getResponseDetailFn, getResponseAiResultsFn (features/responses/server.ts)
   * @usedBy ResponseList (all), ResponseDetail (detail, aiActionResults)
   * @invalidatedBy ResponseList (delete), ResponseDetail (delete/update status)
   */
  responses: {
    all: ['responses'] as const,
    detail: (id: string) => ['response', id] as const,
    aiActionResults: (id: string) => ['response', id, 'ai-action-results'] as const,
  },

  /**
   * @source getAppointmentsFn (features/appointments/queries.ts — no server.ts, uses queries.ts directly)
   * @usedBy AppointmentList
   * @invalidatedBy AppointmentList (cancel), ResponseList (delete response), ResponseDetail (delete response with appointment)
   */
  appointments: {
    all: ['appointments'] as const,
  },

  /**
   * @source getLandingPageFn (features/landing/server.ts)
   * @usedBy TODO: nie znaleziono użycia via queryKeys.landing — prawdopodobnie pobierany przez route loader bezpośrednio
   * @invalidatedBy TODO: nie znaleziono użycia
   */
  landing: {
    all: ['landing-page'] as const,
  },

  /**
   * @source getCalendarConnectionsFn, getCalendarSettingsFn (features/calendar/server.ts)
   * @usedBy CalendarConnectionList (connections), SurveyLinkCalendarSelect (connections), CalendarSettingsForm (settings)
   * @invalidatedBy CalendarConnectionCard (add/remove/update/sync/toggle), AddCalDAVDialog (create)
   */
  calendar: {
    all: ['calendar'] as const,
    connections: ['calendar', 'connections'] as const,
    settings: ['calendar', 'settings'] as const,
  },

  /**
   * @source getShopProductsFn, getShopProductDetailFn (features/shop-products/server.ts)
   * @usedBy ShopProductList (list), ShopProductEditor (detail — via route loader)
   * @invalidatedBy ShopProductList (delete), ShopProductEditor (save/publish/delete)
   */
  shopProducts: {
    all: ['shop-products'] as const,
    list: ['shop-products', 'list'] as const,
    detail: (id: string) => ['shop-products', 'detail', id] as const,
  },

  /**
   * @source getShopCategoriesFn (features/shop-categories/server.ts)
   * @usedBy CategoryManager (list), ShopProductList (list for filter), ShopCategorySelect (list)
   * @invalidatedBy CategoryManager (create/update/delete), ShopCategorySelect (inline create)
   */
  shopCategories: {
    all: ['shop-categories'] as const,
    list: ['shop-categories', 'list'] as const,
    detail: (id: string) => ['shop-categories', 'detail', id] as const,
  },

  /**
   * @source getWorkflowsFn, getWorkflowDetailFn, getWorkflowEmailTemplatesFn, getWorkflowSurveysFn (features/workflows/server.ts)
   * @usedBy WorkflowList (list), WorkflowEditor (detail), ExecutionList (list),
   *   SendEmailConfigPanel (emailTemplates), TriggerConfigPanel (surveys), TestModePanel (ad-hoc key)
   * @invalidatedBy CreateWorkflowDialog (create), WorkflowList (duplicate/delete),
   *   WorkflowDetail (rename/delete), WorkflowEditor (save canvas)
   */
  workflows: {
    all: ['workflows'] as const,
    list: ['workflows', 'list'] as const,
    detail: (id: string) => ['workflows', 'detail', id] as const,
    executions: (workflowId: string) => ['workflows', 'executions', workflowId] as const,
    emailTemplates: ['workflows', 'email-templates'] as const,
    surveys: ['workflows', 'surveys'] as const,
  },

  /**
   * @source getExecutionsFn, getExecutionDetailFn (features/workflows/server.ts)
   * @usedBy ExecutionList (all with filters), ExecutionDetail (detail)
   * @invalidatedBy TestModePanel (after test run, via ad-hoc key based on workflows.all)
   */
  executions: {
    all: (filters?: { workflowId?: string; status?: string }) =>
      filters ? (['executions', filters] as const) : (['executions'] as const),
    detail: (id: string) => ['executions', 'detail', id] as const,
  },

  /**
   * @source getUsersFn (features/users/server.ts)
   * @usedBy UserList (list), EditUserDialog (roles.list for role assignment), AddUserDialog (roles.list)
   * @invalidatedBy UserList (delete/toggle), AddUserDialog (invite), EditUserDialog (update/remove),
   *   RoleList (role change cascades to users), RoleEditor (role change cascades to users)
   */
  users: {
    all: ['users'] as const,
    list: (tenantId?: string | null) =>
      tenantId ? (['users', 'list', tenantId] as const) : (['users'] as const),
    detail: (id: string) => ['users', id] as const,
  },

  /**
   * @source getRolesFn (features/roles/server.ts)
   * @usedBy RoleList (list), EditUserDialog (list by tenant), AddUserDialog (list by tenant)
   * @invalidatedBy TenantForm (tenant save), TenantList (tenant create/delete),
   *   UserList (user change cascades to roles), AddUserDialog, EditUserDialog,
   *   RoleList (role save/delete), RoleEditor (role save/delete)
   */
  roles: {
    all: ['roles'] as const,
    list: (tenantId?: string | null) =>
      tenantId ? (['roles', 'list', tenantId] as const) : (['roles'] as const),
    detail: (id: string) => ['roles', id] as const,
  },

  /**
   * @source getTenantsFn, getTenantDetailFn (features/tenants/server.ts)
   * @usedBy TenantList (all), TenantForm (detail)
   * @invalidatedBy TenantList (create/update/delete), TenantForm (save)
   */
  tenants: {
    all: ['tenants'] as const,
    detail: (id: string) => ['tenants', id] as const,
  },

  /**
   * @source getMarketplaceConnectionsFn, getMarketplaceListingsFn, etc. (features/shop-marketplace/server.ts)
   * @usedBy MarketplaceSettingsPage (connections), MarketplaceImportWizardPage (connections),
   *   MarketplacePublishPanel (connections, listings, listingsByProducts),
   *   CategorySelector (categories), MarketplaceImportWizard (importProgress)
   * @invalidatedBy MarketplaceConnectionCard (disconnect), MarketplaceImportWizard (import complete),
   *   MarketplacePublishPanel (publish/unpublish)
   */
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

  /**
   * @source getDocforgeLicensesFn, getLicenseActivationsFn (features/docforge-licenses/queries.ts — no server.ts)
   * @usedBy LicenseList (all), LicenseDetailPanel (detail, activations)
   * @invalidatedBy LicenseList (deactivate), LicenseDetailPanel (update/toggle/deactivate activations),
   *   CreateLicenseDialog (create)
   */
  docforgeLicenses: {
    all: ['docforge-licenses'] as const,
    detail: (id: string) => ['docforge-licenses', 'detail', id] as const,
    activations: (licenseId: string) => ['docforge-licenses', 'activations', licenseId] as const,
  },

  /**
   * @source getEmailTemplatesFn, getEmailTemplateFn (features/email/server.ts)
   * @usedBy TODO: nie znaleziono użycia via queryKeys.email — email templates loaded via route loaders
   * @invalidatedBy TODO: nie znaleziono użycia via queryKeys.email
   */
  email: {
    all: ['email-templates'] as const,
    templates: ['email-templates', 'list'] as const,
    template: (type: string) => ['email-templates', 'detail', type] as const,
  },

  /**
   * @source blogKeys factory in features/blog/queries.ts (key factory owns its own keys)
   * @usedBy BlogPostList (list, categories), BlogPostEditor (save/publish/delete), CategoryCombobox (categories)
   * @invalidatedBy BlogPostList (delete), BlogPostEditor (save/publish/delete)
   * Note: This group duplicates blogKeys from features/blog/queries.ts for components
   * that import from query-keys.ts. Both sets of keys must stay in sync.
   */
  blog: {
    all: ['blog-posts'] as const,
    list: ['blog-posts', 'list'] as const,
    detail: (id: string) => ['blog-posts', 'detail', id] as const,
    categories: ['blog-posts', 'categories'] as const,
  },
} as const
