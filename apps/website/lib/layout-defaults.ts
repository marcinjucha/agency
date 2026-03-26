import { routes } from '@/lib/routes'

export const defaultNavbar = {
  type: 'navbar' as const,
  ctaText: 'Umów rozmowę',
  ctaHref: `${routes.home}#cta`,
}

export const defaultFooter = {
  type: 'footer' as const,
  description: 'Automatyzacja procesów biznesowych z wykorzystaniem AI.',
  privacy: 'Polityka prywatności',
  terms: 'Regulamin',
  copyright: `© ${new Date().getFullYear()} Halo Efekt. Wszelkie prawa zastrzeżone.`,
}
