import type { Block, SectionBlock, ColumnsBlock } from '../types'

// ---------------------------------------------------------------------------
// Czyste, rekurencyjne operacje na drzewie bloków — fundament dla edytora
// zagnieżdżania (Iter 2 konsumuje je w Canvas/OutlinePanel).
//
// Kontenery dzieci: `section.children`, `columns.leftChildren`,
// `columns.rightChildren`. Wszystkie operacje są NIEMUTOWALNE — zwracają nowe
// tablice/obiekty. UWAGA: bez pełnego structural sharing — kontenery wzdłuż
// przejścia są realokowane nawet gdy nic się w nich nie zmieniło (prostota >
// mikro-optymalizacja re-renderów; drzewa bloków są małe).
//
// TDD: apps/cms/features/email/__tests__/block-tree.test.ts
// ---------------------------------------------------------------------------

/**
 * Maksymalna głębokość zagnieżdżenia sekcji: sekcja może zawierać sekcję
 * (depth 2), ale nie na trzecim poziomie. Egzekwowane w walidacji CMS
 * (validation.ts superRefine) i przez edytor (Iter 2) — typy pozostają
 * rekurencyjne bez kodowania głębokości.
 */
export const MAX_SECTION_DEPTH = 2

/** Klucze tablic-dzieci per typ kontenera. */
function childArraysOf(block: Block): Block[][] {
  if (block.type === 'section') return [block.children as Block[]]
  if (block.type === 'columns') {
    return [block.leftChildren as Block[], block.rightChildren as Block[]]
  }
  return []
}

/**
 * Przemapowuje tablice-dzieci kontenera przez `mapChildren` i zwraca NOWY blok.
 * Dla bloków-liści zwraca blok bez zmian.
 */
function withMappedChildren(block: Block, mapChildren: (children: Block[]) => Block[]): Block {
  if (block.type === 'section') {
    return { ...block, children: mapChildren(block.children as Block[]) as SectionBlock['children'] }
  }
  if (block.type === 'columns') {
    return {
      ...block,
      leftChildren: mapChildren(block.leftChildren as Block[]) as ColumnsBlock['leftChildren'],
      rightChildren: mapChildren(block.rightChildren as Block[]) as ColumnsBlock['rightChildren'],
    }
  }
  return block
}

/** Znajduje blok o danym id na dowolnej głębokości. */
export function findBlockDeep(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block
    for (const children of childArraysOf(block)) {
      const found = findBlockDeep(children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Podmienia blok o `updated.id` (gdziekolwiek w drzewie) na `updated`.
 * Brak dopasowania = drzewo zwrócone bez zmian strukturalnych.
 */
export function updateBlockDeep(blocks: Block[], updated: Block): Block[] {
  return blocks.map((block) => {
    if (block.id === updated.id) return updated
    return withMappedChildren(block, (children) => updateBlockDeep(children, updated))
  })
}

/** Usuwa blok o danym id z jego tablicy rodzeństwa (dowolna głębokość). */
export function deleteBlockDeep(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => withMappedChildren(block, (children) => deleteBlockDeep(children, id)))
}

/** Głęboka kopia poddrzewa ze ŚWIEŻYM id dla KAŻDEGO węzła (nie tylko korzenia). */
function cloneWithFreshIds(block: Block): Block {
  const withId = { ...block, id: crypto.randomUUID() } as Block
  return withMappedChildren(withId, (children) => children.map(cloneWithFreshIds))
}

/**
 * Duplikuje blok o danym id — kopia ląduje ZARAZ ZA oryginałem w jego tablicy
 * rodzeństwa. Regeneruje id CAŁEGO kopiowanego poddrzewa (każde zagnieżdżone
 * dziecko dostaje świeże crypto.randomUUID()) — bez tego edytor miałby
 * zduplikowane klucze i selekcja/edycja trafiałaby w oba bloki naraz.
 */
export function duplicateBlockDeep(
  blocks: Block[],
  id: string,
): { blocks: Block[]; newId: string | null } {
  const index = blocks.findIndex((block) => block.id === id)
  if (index !== -1) {
    const copy = cloneWithFreshIds(blocks[index])
    return {
      blocks: [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)],
      newId: copy.id,
    }
  }

  let newId: string | null = null
  const next = blocks.map((block) => {
    if (newId !== null) return block
    return withMappedChildren(block, (children) => {
      if (newId !== null) return children
      const result = duplicateBlockDeep(children, id)
      if (result.newId !== null) {
        newId = result.newId
        return result.blocks
      }
      return children
    })
  })
  return newId !== null ? { blocks: next, newId } : { blocks, newId: null }
}

/**
 * Wstawia `newBlock` pod wskazanym rodzicem na pozycji `index`.
 * - parentId === null → wstawienie na najwyższym poziomie
 * - parentId sekcji → do jej `children`
 * - parentId kolumn → IGNOROWANE (kolumny jako cel wstawiania = zakres Iter 2)
 * - nieznany parentId → drzewo bez zmian
 */
export function insertBlockDeep(
  blocks: Block[],
  newBlock: Block,
  parentId: string | null,
  index: number,
): Block[] {
  if (parentId === null) {
    return [...blocks.slice(0, index), newBlock, ...blocks.slice(index)]
  }
  return blocks.map((block) => {
    if (block.id === parentId) {
      if (block.type !== 'section') return block
      const children = block.children as Block[]
      return {
        ...block,
        children: [...children.slice(0, index), newBlock, ...children.slice(index)] as SectionBlock['children'],
      }
    }
    return withMappedChildren(block, (children) => insertBlockDeep(children, newBlock, parentId, index))
  })
}

/**
 * Przesuwa blok o 1 pozycję w GÓRĘ (-1) lub DÓŁ (+1) wyłącznie w obrębie jego
 * własnej tablicy rodzeństwa. Ruch poza granicę = no-op (zwraca wejście).
 */
export function moveBlockDeep(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const index = blocks.findIndex((block) => block.id === id)
  if (index !== -1) {
    const target = index + dir
    if (target < 0 || target >= blocks.length) return blocks
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }
  return blocks.map((block) =>
    withMappedChildren(block, (children) => moveBlockDeep(children, id, dir)),
  )
}

/**
 * Zwraca id bloku-rodzica (sekcji lub kolumn) dla danego id.
 * Blok na najwyższym poziomie ORAZ nieznany id → null.
 */
export function getParentId(blocks: Block[], id: string): string | null {
  for (const block of blocks) {
    for (const children of childArraysOf(block)) {
      if (children.some((child) => child.id === id)) return block.id
      const nested = getParentId(children, id)
      if (nested !== null) return nested
    }
  }
  return null
}

/**
 * Głębokość zagnieżdżenia SEKCJI w poddrzewie bloku: sekcja bez sekcji w środku
 * = 1, sekcja zawierająca sekcję = 2, blok nie-sekcyjny = maksimum po dzieciach
 * (0 gdy liść). Kolumny nie mogą zawierać sekcji, ale liczymy generycznie.
 */
export function sectionDepth(block: Block): number {
  const childMax = childArraysOf(block)
    .flat()
    .reduce((max, child) => Math.max(max, sectionDepth(child)), 0)
  return (block.type === 'section' ? 1 : 0) + childMax
}

/** True gdy jakikolwiek blok przekracza maksymalną głębokość sekcji. */
export function exceedsSectionDepth(blocks: Block[], max: number): boolean {
  return blocks.some((block) => sectionDepth(block) > max)
}
