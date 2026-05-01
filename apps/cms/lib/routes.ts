/**
 * Centralized route paths for CMS application.
 * Single source of truth -- prevents typos in href strings.
 *
 * Usage: import { routes } from '@/lib/routes'
 *
 * Static routes are plain strings, dynamic routes are functions.
 */

export const routes = {
  login: '/login',

  admin: {
    root: '/admin',

    // Intake
    surveys: '/admin/surveys',
    surveyNew: '/admin/surveys/new',
    survey: (id: string) => `/admin/surveys/${id}`,
    intake: '/admin/intake',
    responses: '/admin/responses',
    response: (id: string) => `/admin/responses/${id}`,
    appointments: '/admin/appointments',
    calendar: '/admin/calendar',

    // Content
    landingPage: '/admin/landing-page',
    blog: '/admin/blog',
    blogNew: '/admin/blog/new',
    blogPost: (id: string) => `/admin/blog/${id}`,
    media: '/admin/media',
    legalPages: '/admin/legal-pages',
    legalPageNew: '/admin/legal-pages/new',
    legalPage: (id: string) => `/admin/legal-pages/${id}`,

    // Shop
    shopProducts: '/admin/shop/products',
    shopProductNew: '/admin/shop/products/new',
    shopProduct: (id: string) => `/admin/shop/products/${id}`,
    shopCategories: '/admin/shop/categories',
    shopCategoryNew: '/admin/shop/categories/new',
    shopCategory: (id: string) => `/admin/shop/categories/${id}`,

    // Marketplace
    shopMarketplace: '/admin/shop/marketplace',
    shopMarketplaceConnection: (id: string) => `/admin/shop/marketplace/${id}`,
    shopMarketplaceImport: '/admin/shop/marketplace/import',

    // Automation
    workflows: '/admin/workflows',
    workflowNew: '/admin/workflows/new',
    workflow: (id: string) => `/admin/workflows/${id}`,
    workflowEditor: (id: string) => `/admin/workflows/${id}/editor`,
    workflowExecutions: (id: string) => `/admin/workflows/${id}/executions`,
    executionsList: '/admin/workflows/executions',
    execution: (id: string) => `/admin/workflows/executions/${id}`,

    // System
    emailTemplates: '/admin/email-templates',
    emailTemplate: (type: string) => `/admin/email-templates/${type}`,
    settings: '/admin/settings',
    users: '/admin/users',
    roles: '/admin/roles',
    role: (id: string) => `/admin/roles/${id}`,
    tenants: '/admin/tenants',
    tenantNew: '/admin/tenants/new',
    tenant: (id: string) => `/admin/tenants/${id}`,

    // DocForge
    docforgeLicenses: '/admin/docforge/licenses',
    docforgeLicense: (id: string) => `/admin/docforge/licenses/${id}`,
  },

  api: {
    upload: '/api/upload',
    emailTemplatesRender: '/api/email-templates/render',
    authGoogle: '/api/auth/google',
    authGoogleCallback: '/api/auth/google/callback',
    workflowTrigger: '/api/workflows/trigger',
    workflowCallback: '/api/workflows/callback',
    workflowRetry: '/api/workflows/retry',
  },
} as const
