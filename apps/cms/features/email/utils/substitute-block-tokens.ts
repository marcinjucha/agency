import { substituteTokens, substitutePlain } from '@agency/email'
import type { Block, NonColumnsBlock, SectionChildBlock } from '../types'

// ---------------------------------------------------------------------------
// Display-only sample-token substitution for the canvas preview.
//
// Applies the SHARED email substitution primitives (@agency/email) to a block's
// text-bearing fields, matching each field's render context:
//   - `content` (TextBlock HTML → dangerouslySetInnerHTML) → substituteTokens
//     (HTML-escapes the value, same as the real send path)
//   - plain-text fields rendered as React text (companyName / label / url /
//     text / alt) → substitutePlain (no escaping — React escapes on render)
//
// Non-text fields (colors, ids, layout) are untouched. Unknown tokens are left
// BRACKETED by the primitives' leave-literal semantics — so a token with no
// sample value still reads as `{{token}}` in the preview. Returns a NEW block
// (never mutates); ids are preserved so canvas selection/editing keep working.
// ---------------------------------------------------------------------------

export function substituteBlockSampleTokens(
  block: Block,
  values: Record<string, string>,
): Block {
  switch (block.type) {
    case 'text':
      return { ...block, content: substituteTokens(block.content, values) }
    case 'header':
      return { ...block, companyName: substitutePlain(block.companyName, values) }
    case 'heading':
      return { ...block, text: substitutePlain(block.text, values) }
    case 'footer':
      return { ...block, text: substitutePlain(block.text, values) }
    case 'cta':
      return {
        ...block,
        label: substitutePlain(block.label, values),
        url: substitutePlain(block.url, values),
      }
    case 'image':
      return { ...block, alt: substitutePlain(block.alt, values) }
    case 'section':
      return {
        ...block,
        children: block.children.map(
          (child) => substituteBlockSampleTokens(child, values) as SectionChildBlock,
        ),
      }
    case 'columns':
      return {
        ...block,
        leftChildren: block.leftChildren.map(
          (child) => substituteBlockSampleTokens(child, values) as NonColumnsBlock,
        ),
        rightChildren: block.rightChildren.map(
          (child) => substituteBlockSampleTokens(child, values) as NonColumnsBlock,
        ),
      }
    default:
      // divider / spacer — no text-bearing fields.
      return block
  }
}
