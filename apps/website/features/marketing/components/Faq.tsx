// FAQ — 2-col (sticky left SectionHead, right accordion). useState open index (default 0).
// Faithful port of project/landing/faq.jsx. Real <button> toggles + aria-expanded,
// rotating plus icon, grid-rows height transition.
import { useState } from 'react'
import { Plus } from 'lucide-react'

import { landingContent } from '../content'
import { ScrollReveal } from './ScrollReveal'
import { Section, Container, SectionHead } from './primitives'

export function Faq() {
  const { eyebrow, title, items } = landingContent.faq
  const [open, setOpen] = useState(0)

  return (
    <Section id="faq" tone="white">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
          <ScrollReveal>
            <div className="lg:sticky lg:top-24">
              <SectionHead eyebrow={eyebrow} title={title} max="max-w-xs" />
            </div>
          </ScrollReveal>
          <div className="divide-y divide-[var(--hair)] border-t border-[var(--hair)]">
            {items.map((it, i) => {
              const isOpen = open === i
              return (
                <ScrollReveal key={it.q} delay={Math.min(i, 4) * 50}>
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      className="group flex w-full items-start gap-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-md"
                      aria-expanded={isOpen}
                    >
                      <span
                        className="flex-1 text-[16.5px] md:text-[17px] font-semibold leading-snug text-[var(--ink)]"
                        style={{ textWrap: 'pretty' }}
                      >
                        {it.q}
                      </span>
                      <span
                        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                          isOpen
                            ? 'rotate-45 border-primary bg-primary text-white'
                            : 'border-[var(--hair)] text-[var(--muted)] group-hover:border-primary/50'
                        }`}
                      >
                        <Plus size={15} strokeWidth={1.75} />
                      </span>
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p
                          className="pb-6 pr-12 text-[15px] leading-relaxed text-[var(--muted)]"
                          style={{ textWrap: 'pretty' }}
                        >
                          {it.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </Container>
    </Section>
  )
}
