import React from 'react'
import { Html, Head, Body, Container } from '@react-email/components'
import { render } from '@react-email/render'
import { BLOCK_REGISTRY } from './blocks/registry'
import type { Block, BlockType } from './blocks/types'

interface EmailTemplateProps {
  blocks: Block[]
}

/**
 * Renderuje pojedynczy blok emaila.
 * Eksportowany dla ColumnsBlock — potrzebuje recursive call żeby renderować zagnieżdżone dzieci.
 * Opcja D (z specyfikacji): standalone function exportowana z EmailRenderer.tsx,
 * importowana przez ColumnsBlock.tsx — brak circular dependency.
 */
export function renderBlock(block: Block) {
  const entry = BLOCK_REGISTRY[block.type as BlockType]
  if (!entry) {
    console.warn(`[EmailRenderer] Nieznany typ bloku: "${block.type}" — blok pominięty`)
    return null
  }
  const Component = entry.RendererComponent as (props: { block: Block }) => React.ReactElement | null
  return <Component key={(block as { id: string }).id} block={block} />
}

function EmailTemplate({ blocks }: EmailTemplateProps) {
  return (
    <Html lang="pl">
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {blocks.map(renderBlock)}
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Render email blocks to HTML string.
 * Używany przez CMS API route dla live preview i przez save action do pre-renderowania html_body.
 */
export async function renderEmailBlocks(blocks: Block[]): Promise<string> {
  return render(<EmailTemplate blocks={blocks} />)
}
