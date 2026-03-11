import { Html, Head, Body, Container } from '@react-email/components'
import { render } from '@react-email/render'
import type { Block } from './blocks/types'
import { HeaderBlockComponent } from './blocks/HeaderBlock'
import { TextBlockComponent } from './blocks/TextBlock'
import { CtaBlockComponent } from './blocks/CtaBlock'
import { DividerBlockComponent } from './blocks/DividerBlock'
import { FooterBlockComponent } from './blocks/FooterBlock'

interface EmailTemplateProps {
  blocks: Block[]
}

function EmailTemplate({ blocks }: EmailTemplateProps) {
  return (
    <Html lang="pl">
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', maxWidth: '600px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {blocks.map((block) => {
            switch (block.type) {
              case 'header': return <HeaderBlockComponent key={block.id} block={block} />
              case 'text': return <TextBlockComponent key={block.id} block={block} />
              case 'cta': return <CtaBlockComponent key={block.id} block={block} />
              case 'divider': return <DividerBlockComponent key={block.id} block={block} />
              case 'footer': return <FooterBlockComponent key={block.id} block={block} />
            }
          })}
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Render email blocks to HTML string
 * Used by CMS API route for live preview and by save action to pre-render html_body
 */
export async function renderEmailBlocks(blocks: Block[]): Promise<string> {
  return render(<EmailTemplate blocks={blocks} />)
}
