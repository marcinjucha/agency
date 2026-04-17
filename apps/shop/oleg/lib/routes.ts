export const routes = {
  home: '/',
  products: '/produkty',
  product: (slug: string) => `/produkty/${slug}`,
  contact: '/kontakt',
  politykaPrywatnosci: '/polityka-prywatnosci',
} as const
