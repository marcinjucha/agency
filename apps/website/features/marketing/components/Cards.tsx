// Cards "Sześć obszarów" — 2-column grid of 6 cards (GridCards variant).
// Faithful port of project/landing/cards.jsx GridCards(). EditorialCards is NOT ported.
// ScrollReveal gets h-full so equal-height cards survive the grid (ag-design-patterns rule).
import { Check } from 'lucide-react'

import { landingContent, type CardItem } from '../content'
import { ICON_MAP } from './icons'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, SectionHead } from './primitives'

function GainList({ gains }: { gains: readonly string[] }) {
  return (
    <ul className="space-y-2.5">
      {gains.map((g) => (
        <li key={g} className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <Check size={11} strokeWidth={1.75} className="text-primary" />
          </span>
          <span className="text-[13.5px] leading-snug text-[var(--ink-2)]">{g}</span>
        </li>
      ))}
    </ul>
  )
}

function CardHead({ item }: { item: CardItem }) {
  const Icon = ICON_MAP[item.icon]
  return (
    <div className="flex items-center justify-between">
      <span className="mono text-[12px] tracking-[0.15em] text-primary">{item.n}</span>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--hair)] bg-[var(--bg-alt)] text-[var(--ink)]">
        <Icon size={19} strokeWidth={1.75} />
      </div>
    </div>
  )
}

export function Cards() {
  const { eyebrow, title, sub, items } = landingContent.cards
  return (
    <Section id="obszary" tone="alt">
      <Container>
        <ScrollReveal>
          <SectionHead eyebrow={eyebrow} title={title} sub={sub} max="max-w-2xl" />
        </ScrollReveal>
        <div className="mt-12 md:mt-14">
          <div className="grid gap-5 sm:grid-cols-2 md:gap-6">
            {items.map((item, i) => (
              <ScrollReveal key={item.n} delay={(i % 2) * 90} className="h-full">
                <div className="card-lift flex h-full flex-col rounded-2xl bg-white p-6 ring-soft md:p-7">
                  <CardHead item={item} />
                  <div className="mono mt-5 text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
                    {item.area}
                  </div>
                  <h3
                    className="serif mt-2 text-[20px] md:text-[21px] leading-[1.2] tracking-[-0.01em] text-[var(--ink)]"
                    style={{ fontWeight: 600, textWrap: 'balance' }}
                  >
                    {item.promise}
                  </h3>
                  <p
                    className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]"
                    style={{ textWrap: 'pretty' }}
                  >
                    {item.body}
                  </p>
                  <div className="mt-auto border-t border-[var(--hair)] pt-5">
                    <div className="mono mb-3 text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                      Co zyskujesz
                    </div>
                    <GainList gains={item.gains} />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
