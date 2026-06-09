// Landing — page composition. Renders the fixed navbar then the <main> sections.
// Does NOT render a footer (SiteFooter is global, added by __root).
// Section order + ids match the prototype:
//   Hero → Intro (#co-robimy) → Capabilities → Cards (#obszary) →
//   Process (#wspolpraca) → Why (#dlaczego-my) → FinalCTA (#audyt) → Faq (#faq)
import { LandingNavbar } from './LandingNavbar'
import { Hero } from './Hero'
import { Intro } from './Intro'
import { Capabilities } from './Capabilities'
import { Cards } from './Cards'
import { Process } from './Process'
import { Why } from './Why'
import { FinalCTA } from './FinalCTA'
import { Faq } from './Faq'

interface LandingProps {
  ctaUrl: string
}

export function Landing({ ctaUrl }: LandingProps) {
  return (
    <>
      <LandingNavbar ctaUrl={ctaUrl} />
      <main>
        <Hero ctaUrl={ctaUrl} />
        <Intro />
        <Capabilities />
        <Cards />
        <Process />
        <Why />
        <FinalCTA ctaUrl={ctaUrl} />
        <Faq />
      </main>
    </>
  )
}
