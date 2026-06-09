// Intro "Co robimy" — sticky left heading, right lead + examples list + close.
// Faithful port of project/landing/intro.jsx Intro().
import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, Eyebrow } from './primitives'

export function Intro() {
  const { eyebrow, heading, lead, examples, close } = landingContent.intro
  return (
    <Section id="co-robimy" tone="white" dense>
      <Container>
        <div className="grid items-start gap-8 lg:grid-cols-[0.45fr_0.55fr] lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <ScrollReveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </ScrollReveal>
            <ScrollReveal delay={60}>
              <h2
                className="serif mt-5 text-[27px] md:text-[33px] leading-[1.14] tracking-[-0.02em] text-[var(--ink)]"
                style={{ fontWeight: 500, textWrap: 'balance' }}
              >
                {heading}
              </h2>
            </ScrollReveal>
          </div>
          <div className="max-w-2xl lg:pt-1">
            <ScrollReveal delay={80}>
              <p
                className="text-[17px] md:text-[18.5px] leading-relaxed text-[var(--ink-2)]"
                style={{ textWrap: 'pretty' }}
              >
                {lead}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={140}>
              <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-2.5">
                    <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span className="text-[15px] leading-snug text-[var(--ink-2)]">{ex}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <ScrollReveal delay={220}>
              <p
                className="mt-7 text-[16px] md:text-[16.5px] leading-relaxed text-[var(--muted)]"
                style={{ textWrap: 'pretty' }}
              >
                {close}
              </p>
            </ScrollReveal>
          </div>
        </div>
      </Container>
    </Section>
  )
}
