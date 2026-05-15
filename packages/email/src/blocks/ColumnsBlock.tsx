/**
 * ColumnsBlock — dwukolumnowy renderer emaila.
 *
 * Używa @react-email Row + Column (nie CSS grid/flexbox) dla zgodności z klientami email
 * (Outlook, Gmail), które nie wspierają nowoczesnych layoutów CSS.
 *
 * Renderuje zagnieżdżone bloki rekurencyjnie via renderBlock z EmailRenderer.tsx.
 * Opcja D: import z EmailRenderer.tsx (renderBlock jako standalone export) — brak circular dep
 * bo ColumnsBlock.tsx importuje EmailRenderer, a nie odwrotnie.
 *
 * Overflow safety (AAA-T-221, 2026-05-15):
 *   - `tableLayout: 'fixed'` na outer Section's <table>: wymusza respektowanie
 *     szerokości komórek (50%/50%) niezależnie od zawartości. Bez tego,
 *     długi nieprzełamywalny tekst (np. "asdfasdfasdf..." bez spacji) rozciąga
 *     kolumnę poza granice email Containera (640px). table-layout:fixed jest
 *     wspierany we WSZYSTKICH klientach email.
 *   - `overflowWrap: 'break-word'` + `wordWrap: 'break-word'` (legacy alias)
 *     na zawartości kolumn: pozwala długim tekstom zawijać się w obrębie
 *     50%-wide cell. NIE używamy `wordBreak: 'break-word'` — Gmail/Outlook
 *     interpretują tę legacy IE-only property jak `word-break: break-all`,
 *     rozbijając tekst PO ZNAKU zamiast tylko gdy słowo nie mieści się.
 *     `overflow-wrap` jest standardową properties dla "break only when
 *     necessary"; `word-wrap` to legacy alias dla maksymalnej kompatybilności.
 */

import React from 'react'
import { Row, Column, Section } from '@react-email/components'
import type { ColumnsBlock, NonColumnsBlock } from './block-interfaces'
import { renderBlock } from '../EmailRenderer'

// Mapowanie gap → padding-left kolumny prawej (px)
const GAP_SIZE: Record<ColumnsBlock['gap'], string> = {
  sm: '8px',
  md: '16px',
  lg: '32px',
}

// Mapowanie verticalAlign → styl CSS dla Column
const VERTICAL_ALIGN_STYLE: Record<ColumnsBlock['verticalAlign'], React.CSSProperties['verticalAlign']> = {
  top: 'top',
  middle: 'middle',
  bottom: 'bottom',
}

export function ColumnsBlockComponent({ block }: { block: ColumnsBlock }) {
  const gap = GAP_SIZE[block.gap]
  const vAlign = VERTICAL_ALIGN_STYLE[block.verticalAlign]

  // Allow unbreakable strings (URLs, "asdfasdf...") to wrap inside the
  // 50%-wide column instead of expanding the cell beyond container.
  // Use overflow-wrap (modern) + word-wrap (legacy alias) — NOT word-break,
  // which Gmail/Outlook treat like `break-all` and split per character.
  const cellContent: React.CSSProperties = {
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
  }

  return (
    <Section style={{ tableLayout: 'fixed', width: '100%' }}>
      <Row>
        <Column
          style={{
            width: '50%',
            verticalAlign: vAlign,
            ...cellContent,
          }}
        >
          {block.leftChildren.map((child: NonColumnsBlock) => renderBlock(child))}
        </Column>
        <Column
          style={{
            width: '50%',
            paddingLeft: gap,
            verticalAlign: vAlign,
            ...cellContent,
          }}
        >
          {block.rightChildren.map((child: NonColumnsBlock) => renderBlock(child))}
        </Column>
      </Row>
    </Section>
  )
}
