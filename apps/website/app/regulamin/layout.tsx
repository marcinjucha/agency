import { Navbar } from '@/features/marketing/components/Navbar'
import { Footer } from '@/features/marketing/components/Footer'
import { defaultNavbar, defaultFooter } from '@/lib/layout-defaults'

export default function RegulaminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar {...defaultNavbar} />
      <main>{children}</main>
      <Footer {...defaultFooter} />
    </>
  )
}
