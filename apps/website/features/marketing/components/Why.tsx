// Why "Dlaczego my" — 4 items (icon + title + desc), 2-col, tone alt.
// Faithful port of project/landing/why.jsx.
import { landingContent } from '../content'
import { ICON_MAP } from './icons'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, SectionHead } from './primitives'

export function Why() {
  const { eyebrow, title, items } = landingContent.why
  return (
    <Section id="dlaczego-my" tone="alt">
      <Container>
        <ScrollReveal>
          <SectionHead eyebrow={eyebrow} title={title} max="max-w-2xl" />
        </ScrollReveal>
        <div className="mt-12 grid max-w-4xl gap-x-8 gap-y-9 sm:grid-cols-2 md:gap-y-10">
          {items.map((it, i) => {
            const Icon = ICON_MAP[it.icon]
            return (
              <ScrollReveal key={it.t} delay={(i % 2) * 90}>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-soft">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3
                      className="serif text-[19px] md:text-[20px] tracking-[-0.01em] text-[var(--ink)]"
                      style={{ fontWeight: 600 }}
                    >
                      {it.t}
                    </h3>
                    <p
                      className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--muted)]"
                      style={{ textWrap: 'pretty' }}
                    >
                      {it.d}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
