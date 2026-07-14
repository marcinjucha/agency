/**
 * SectionBlock — kontener grupujący bloki (parytet z React Email <Section>).
 *
 * Sekcja jest w BORDER_ON_CHILD_TYPES (EmailRenderer) — dostaje `border` propem
 * i aplikuje border/tło/radius na WŁASNYM <Section>, dzięki czemu renderBlock
 * nie owija jej drugim wrapperem (unikamy double-wrappingu).
 *
 * Padding: JEDEN preset (SECTION_PADDING_PX) — świadome odstępstwo od modelu v2
 * "baked padding": kontener musi przełączać się między kartą (padded) a
 * full-bleed ('none'), nigdy per-side. Padding żyje na wewnętrznym <div>
 * (konwencja HeaderBlock: <Section> to <table>, padding na table nie wpycha
 * treści do środka w klientach email); tło/border/radius zostają na Section,
 * żeby obejmowały pełną szerokość.
 *
 * Dzieci renderują się rekurencyjnie przez renderBlock (ten sam kierunek importu
 * co ColumnsBlock.tsx → brak circular dep) z rytmem pionowym lustrzanym do pętli
 * Containera w EmailTemplate: ostatnie dziecko dostaje marginBottom 0.
 */

import React from 'react'
import { Section } from '@react-email/components'
import type { SectionBlock } from './block-interfaces'
import { SECTION_PADDING_PX } from './defaults'
import { renderBlock, resolveBlockMarginBottom } from '../EmailRenderer'
import type { ThemeColorMap } from '../theme'

export function SectionBlockComponent({
  block,
  border,
  theme,
}: {
  block: SectionBlock
  border?: React.CSSProperties
  theme?: ThemeColorMap
}) {
  const paddingPx = SECTION_PADDING_PX[block.padding ?? 'md']
  const lastIndex = block.children.length - 1

  return (
    <Section style={{ ...border }}>
      <div style={paddingPx > 0 ? { padding: `${paddingPx}px` } : undefined}>
        {block.children.map((child, index) =>
          renderBlock(child, index === lastIndex ? 0 : resolveBlockMarginBottom(child), theme)
        )}
      </div>
    </Section>
  )
}
