/** Centralized route paths for the Jacek shop */
export const routes = {
  home: '/',
  products: '/produkty',
  product: (slug: string) => `/produkty/${slug}` as const,
  categories: '/kategorie',
  category: (slug: string) => `/kategorie/${slug}` as const,
  about: '/o-autorze',
  contact: '/kontakt',
} as const
