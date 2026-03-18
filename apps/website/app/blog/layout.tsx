import { Navbar } from '@/features/marketing/components/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

const defaultNavbar = {
  type: 'navbar' as const,
  ctaText: 'Umów rozmowę',
  ctaHref: '/#cta',
}

const defaultFooter = {
  type: 'footer' as const,
  description: 'Automatyzacja procesów biznesowych z wykorzystaniem AI.',
  privacy: 'Polityka prywatności',
  terms: 'Regulamin',
  copyright: `© ${new Date().getFullYear()} Halo Efekt. Wszelkie prawa zastrzeżone.`,
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar {...defaultNavbar} />
      <main>{children}</main>
      <Footer {...defaultFooter} />
    </>
  )
}
