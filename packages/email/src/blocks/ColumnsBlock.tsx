/**
 * ColumnsBlock — dwukolumnowy renderer emaila.
 *
 * Używa @react-email Row + Column (nie CSS grid/flexbox) dla zgodności z klientami email
 * (Outlook, Gmail), które nie wspierają nowoczesnych layoutów CSS.
 *
 * Renderuje zagnieżdżone bloki rekurencyjnie via renderBlock z EmailRenderer.tsx.
 * Opcja D: import z EmailRenderer.tsx (renderBlock jako standalone export) — brak circular dep
 * bo ColumnsBlock.tsx importuje EmailRenderer, a nie odwrotnie.
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

  return (
    <Section style={{ padding: '8px 0' }}>
      <Row>
        <Column
          style={{
            width: '50%',
            verticalAlign: vAlign,
          }}
        >
          {block.leftChildren.map((child: NonColumnsBlock) => renderBlock(child))}
        </Column>
        <Column
          style={{
            width: '50%',
            paddingLeft: gap,
            verticalAlign: vAlign,
          }}
        >
          {block.rightChildren.map((child: NonColumnsBlock) => renderBlock(child))}
        </Column>
      </Row>
    </Section>
  )
}
