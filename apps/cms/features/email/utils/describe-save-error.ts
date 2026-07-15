import type { ZodError } from 'zod'
import { CMS_BLOCK_REGISTRY } from '../block-registry'
import { messages, templates } from '@/lib/messages'
import type { Block, BlockType } from '../types'

/**
 * describeSaveError — tłumaczy pierwszy błąd walidacji `updateEmailTemplateSchema`
 * na PRZYJAZNY komunikat + id bloku do zaznaczenia na canvasie.
 *
 * WHY: surowy błąd zod (`blocks[3].children[2].url`) nic userowi nie mówi —
 * przy zagnieżdżonych sekcjach nie wiadomo NAWET który to przycisk. Ten helper
 * przechodzi ścieżkę zod przez drzewo bloków (blocks / children / leftChildren /
 * rightChildren) do wadliwego bloku, zwraca jego id (żeby edytor go zaznaczył)
 * i komunikat złożony z etykiety bloku z rejestru + ludzkiej nazwy pola.
 *
 * Pure — testowalne bez montowania edytora.
 */

export interface SaveErrorDescription {
  /** Id wadliwego bloku (do zaznaczenia); null gdy błąd nie dotyczy bloku (np. temat). */
  blockId: string | null
  /** Gotowy komunikat dla usera (PL, z messages). */
  message: string
}

// Ludzkie nazwy pól bloku — tylko te, które user realnie wypełnia i które mogą
// nie przejść walidacji. Nieznane pole → fallback na generyczny komunikat.
const FIELD_LABELS: Record<string, string> = {
  url: 'adres URL',
  label: 'tekst przycisku',
  content: 'treść',
  text: 'tekst',
  companyName: 'nazwę firmy',
  src: 'adres obrazu',
  subject: 'temat',
}

/** Klucze tablic-dzieci per kontener — lustro block-tree.childArraysOf. */
function childArrayKeys(block: Block): ReadonlyArray<'children' | 'leftChildren' | 'rightChildren'> {
  if (block.type === 'section') return ['children']
  if (block.type === 'columns') return ['leftChildren', 'rightChildren']
  return []
}

/**
 * Przechodzi ścieżkę zod (np. ['blocks', 3, 'children', 2, 'url']) przez drzewo
 * i zwraca blok, którego ona dotyczy (najgłębszy trafiony), lub null.
 */
function resolveBlockAtPath(blocks: Block[], path: ReadonlyArray<string | number>): Block | null {
  if (path[0] !== 'blocks' || typeof path[1] !== 'number') return null

  let current: Block | undefined = blocks[path[1]]
  let i = 2
  while (current && i < path.length) {
    const seg = path[i]
    // Segment tablicy-dzieci + następujący po nim indeks → zejście w głąb.
    if (
      (seg === 'children' || seg === 'leftChildren' || seg === 'rightChildren') &&
      childArrayKeys(current).includes(seg) &&
      typeof path[i + 1] === 'number'
    ) {
      const arr: Block[] | undefined = (current as unknown as Record<string, Block[]>)[seg]
      current = arr?.[path[i + 1] as number]
      i += 2
      continue
    }
    // Segment pola (np. 'url') — koniec zejścia; blok już mamy.
    break
  }
  return current ?? null
}

export function describeSaveError(
  blocks: Block[],
  error: ZodError,
): SaveErrorDescription {
  const issue = error.issues[0]
  if (!issue) {
    return { blockId: null, message: messages.email.templateSaveFailed }
  }

  // Błąd na temacie (poza drzewem bloków).
  if (issue.path[0] === 'subject') {
    return { blockId: null, message: issue.message }
  }

  const block = resolveBlockAtPath(blocks, issue.path)
  if (!block) {
    // Błąd niepowiązany z konkretnym blokiem (np. „szablon musi mieć blok").
    return { blockId: null, message: issue.message }
  }

  const fieldKey = String(issue.path.at(-1) ?? '')
  const fieldLabel = FIELD_LABELS[fieldKey]
  const blockLabel = CMS_BLOCK_REGISTRY[block.type as BlockType]?.label ?? block.type

  // Znane pole → przyjazny komunikat „Uzupełnij X w bloku Y"; nieznane → surowy
  // komunikat zod z rejestrową etykietą bloku jako kontekstem.
  const message = fieldLabel
    ? templates.email.saveBlockError(blockLabel, fieldLabel)
    : `„${blockLabel}": ${issue.message}`

  return { blockId: block.id, message }
}
