// Process "Jak wygląda współpraca" — 4 steps, desktop connecting line, numbered circles.
// Faithful port of project/landing/process.jsx.
import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, SectionHead } from './primitives'

export function Process() {
  const { eyebrow, title, steps } = landingContent.process
  return (
    <Section id="wspolpraca" tone="white">
      <Container>
        <ScrollReveal>
          <SectionHead eyebrow={eyebrow} title={title} max="max-w-2xl" />
        </ScrollReveal>

        <div className="relative mt-14">
          {/* Connecting line (desktop) */}
          <div className="absolute top-7 left-0 right-0 hidden h-px bg-[var(--hair)] lg:block" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 110}>
                <div className="relative">
                  <div className="flex items-center gap-3 lg:block">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white ring-soft">
                      <span className="serif text-[22px] text-primary" style={{ fontWeight: 600 }}>
                        {s.n}
                      </span>
                    </div>
                  </div>
                  <h3
                    className="serif mt-5 text-[20px] md:text-[22px] tracking-[-0.01em] text-[var(--ink)]"
                    style={{ fontWeight: 600 }}
                  >
                    {s.label}
                  </h3>
                  <p
                    className="mt-2.5 text-[14.5px] leading-relaxed text-[var(--muted)]"
                    style={{ textWrap: 'pretty' }}
                  >
                    {s.text}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
