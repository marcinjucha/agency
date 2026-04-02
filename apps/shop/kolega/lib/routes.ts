export const routes = {
  home: '/',
  products: '/produkty',
  product: (slug: string) => `/produkty/${slug}`,
  contact: '/kontakt',
} as const
