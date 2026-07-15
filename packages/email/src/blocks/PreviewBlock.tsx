import { Preview } from '@react-email/components'
import type { PreviewBlock } from './block-interfaces'

/**
 * PreviewBlock — ukryty preheader (parytet React Email <Preview>, Iter 3).
 *
 * <Preview> renderuje tekst w ukrytym divie (display:none + white-space
 * padding), który klienty pocztowe pokazują jako snippet obok tematu na
 * liście skrzynki. Pozycja bloku w treści nie ma znaczenia — @react-email
 * sam ukrywa zawartość; per docs <Preview> ma być dzieckiem <Body>, co
 * renderBlock zapewnia (wszystkie bloki renderują się w <Body>/<Container>).
 *
 * Pusty tekst = brak <Preview> w outputcie (nie emitujemy pustego preheadera,
 * który zjadałby snippet pierwszym tekstem maila).
 */
export function PreviewBlockComponent({ block }: { block: PreviewBlock }) {
  if (!block.text.trim()) return null
  return <Preview>{block.text}</Preview>
}
