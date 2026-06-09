// Capabilities "Co usprawniamy" — static wrapped pill tiles (NOT an animated marquee).
// Faithful port of project/landing/intro.jsx Marquee() with the pills rendered
// statically (flex-wrap) instead of the scrolling track.
import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Container, Eyebrow } from './primitives'

export function Capabilities() {
  const { eyebrow, lead, items } = landingContent.capabilities
  return (
    <div className="relative border-y border-[var(--hair)] bg-[var(--bg-alt)] py-12 md:py-16">
      <Container>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <ScrollReveal>
            <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <h2
              className="serif mt-5 text-[26px] md:text-[33px] leading-[1.14] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontWeight: 500, textWrap: 'balance' }}
            >
              {lead}
            </h2>
          </ScrollReveal>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {items.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full border border-[var(--hair)] bg-white px-3.5 py-2 text-[13.5px] text-[var(--ink-2)]"
            >
              {t}
            </span>
          ))}
        </div>
      </Container>
    </div>
  )
}
