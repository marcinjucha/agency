import { describe, it, expect } from 'vitest'
import type { Block, SectionBlock, TextBlock, ColumnsBlock } from '../types'
import {
  MAX_SECTION_DEPTH,
  findBlockDeep,
  updateBlockDeep,
  deleteBlockDeep,
  duplicateBlockDeep,
  insertBlockDeep,
  moveBlockDeep,
  getParentId,
  sectionDepth,
  exceedsSectionDepth,
  countBlocksDeep,
  insertExclusionsForDepth,
} from '../utils/block-tree'

// ---------------------------------------------------------------------------
// Fixtures — drzewo z sekcją-w-sekcji (depth 2) + columns z dziećmi leaf-only.
// deepFreeze pilnuje niemutowalności: każda mutacja wejścia rzuci TypeError.
// ---------------------------------------------------------------------------

function text(id: string, content = `<p>${id}</p>`): TextBlock {
  return { id, type: 'text', content }
}

function section(id: string, children: Block[]): SectionBlock {
  return { id, type: 'section', children: children as SectionBlock['children'], padding: 'md' }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value as object).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

function makeTree(): Block[] {
  const columns: ColumnsBlock = {
    id: 'cols',
    type: 'columns',
    leftChildren: [text('col-left')],
    rightChildren: [text('col-right')],
    gap: 'md',
    verticalAlign: 'top',
  }
  return deepFreeze([
    text('top-1'),
    section('sec-outer', [
      text('sec-child'),
      section('sec-inner', [text('deep-text')]),
    ]),
    columns,
    text('top-2'),
  ])
}

function collectIds(blocks: Block[]): string[] {
  const ids: string[] = []
  const walk = (list: Block[]): void =>
    list.forEach((b) => {
      ids.push(b.id)
      if (b.type === 'section') walk(b.children as Block[])
      if (b.type === 'columns') {
        walk(b.leftChildren as Block[])
        walk(b.rightChildren as Block[])
      }
    })
  walk(blocks)
  return ids
}

describe('findBlockDeep', () => {
  it('finds a block nested at depth 2 (section-in-section)', () => {
    const found = findBlockDeep(makeTree(), 'deep-text')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('deep-text')
  })

  it('finds blocks inside columns children', () => {
    expect(findBlockDeep(makeTree(), 'col-right')?.id).toBe('col-right')
  })

  it('returns null for unknown id', () => {
    expect(findBlockDeep(makeTree(), 'nope')).toBeNull()
  })
})

describe('updateBlockDeep', () => {
  it('replaces a nested child inside section-in-section without mutating input', () => {
    const tree = makeTree()
    const updated = updateBlockDeep(tree, text('deep-text', '<p>zmienione</p>'))
    const found = findBlockDeep(updated, 'deep-text') as TextBlock
    expect(found.content).toBe('<p>zmienione</p>')
    // wejście nietknięte
    expect((findBlockDeep(tree, 'deep-text') as TextBlock).content).toBe('<p>deep-text</p>')
    // nietknięta gałąź współdzieli referencję
    expect(updated[0]).toBe(tree[0])
  })
})

describe('deleteBlockDeep', () => {
  it('deletes a nested block', () => {
    const result = deleteBlockDeep(makeTree(), 'deep-text')
    expect(findBlockDeep(result, 'deep-text')).toBeNull()
    expect(findBlockDeep(result, 'sec-inner')).not.toBeNull()
  })

  it('deletes a top-level block', () => {
    const result = deleteBlockDeep(makeTree(), 'top-1')
    expect(result.map((b) => b.id)).toEqual(['sec-outer', 'cols', 'top-2'])
  })
})

describe('duplicateBlockDeep', () => {
  it('inserts the copy right after the original within its sibling array', () => {
    const { blocks, newId } = duplicateBlockDeep(makeTree(), 'sec-child')
    expect(newId).not.toBeNull()
    const outer = findBlockDeep(blocks, 'sec-outer') as SectionBlock
    expect(outer.children[0].id).toBe('sec-child')
    expect(outer.children[1].id).toBe(newId)
    expect(outer.children).toHaveLength(3)
  })

  it('regenerates ALL ids in the copied subtree (count matches, every id fresh)', () => {
    const tree = makeTree()
    const originalIds = new Set(collectIds(tree))
    const { blocks, newId } = duplicateBlockDeep(tree, 'sec-outer')
    const copy = findBlockDeep(blocks, newId as string) as SectionBlock
    const copyIds = collectIds([copy])
    // ta sama liczba węzłów co oryginalne poddrzewo (sec-outer, sec-child, sec-inner, deep-text)
    expect(copyIds).toHaveLength(4)
    // każdy id świeży
    copyIds.forEach((id) => expect(originalIds.has(id)).toBe(false))
    // brak duplikatów wewnątrz kopii
    expect(new Set(copyIds).size).toBe(copyIds.length)
  })

  it('returns newId null for unknown id', () => {
    const tree = makeTree()
    const { blocks, newId } = duplicateBlockDeep(tree, 'nope')
    expect(newId).toBeNull()
    expect(blocks).toBe(tree)
  })
})

describe('insertBlockDeep', () => {
  it('inserts into a section by parentId at given index', () => {
    const result = insertBlockDeep(makeTree(), text('fresh'), 'sec-inner', 0)
    const inner = findBlockDeep(result, 'sec-inner') as SectionBlock
    expect(inner.children.map((c) => c.id)).toEqual(['fresh', 'deep-text'])
  })

  it('inserts top-level when parentId is null', () => {
    const result = insertBlockDeep(makeTree(), text('fresh'), null, 1)
    expect(result.map((b) => b.id)).toEqual(['top-1', 'fresh', 'sec-outer', 'cols', 'top-2'])
  })

  it('ignores columns as insert target (Iter 2 scope)', () => {
    const tree = makeTree()
    const result = insertBlockDeep(tree, text('fresh'), 'cols', 0)
    expect(findBlockDeep(result, 'fresh')).toBeNull()
  })
})

describe('moveBlockDeep', () => {
  it('moves a block within its own sibling array', () => {
    const result = moveBlockDeep(makeTree(), 'sec-inner', -1)
    const outer = findBlockDeep(result, 'sec-outer') as SectionBlock
    expect(outer.children.map((c) => c.id)).toEqual(['sec-inner', 'sec-child'])
  })

  it('boundary move is a no-op', () => {
    const tree = makeTree()
    expect(moveBlockDeep(tree, 'top-1', -1)).toBe(tree)
    const outer = findBlockDeep(moveBlockDeep(tree, 'sec-inner', 1), 'sec-outer') as SectionBlock
    expect(outer.children.map((c) => c.id)).toEqual(['sec-child', 'sec-inner'])
  })
})

describe('getParentId', () => {
  it('returns section id for a section child', () => {
    expect(getParentId(makeTree(), 'deep-text')).toBe('sec-inner')
    expect(getParentId(makeTree(), 'sec-inner')).toBe('sec-outer')
  })

  it('returns columns id for a columns child', () => {
    expect(getParentId(makeTree(), 'col-left')).toBe('cols')
  })

  it('returns null for top-level and unknown ids', () => {
    expect(getParentId(makeTree(), 'top-1')).toBeNull()
    expect(getParentId(makeTree(), 'nope')).toBeNull()
  })
})

describe('sectionDepth / exceedsSectionDepth', () => {
  it('depth 2 (section-in-section) is allowed', () => {
    const tree = makeTree()
    expect(sectionDepth(findBlockDeep(tree, 'sec-outer') as Block)).toBe(2)
    expect(exceedsSectionDepth(tree, MAX_SECTION_DEPTH)).toBe(false)
  })

  it('depth 3 exceeds MAX_SECTION_DEPTH', () => {
    const tree = [section('a', [section('b', [section('c', [text('t')])])])]
    expect(sectionDepth(tree[0])).toBe(3)
    expect(exceedsSectionDepth(tree, MAX_SECTION_DEPTH)).toBe(true)
  })

  it('non-section blocks have depth 0', () => {
    expect(sectionDepth(text('t'))).toBe(0)
  })
})

describe('immutability', () => {
  it('operations never mutate the (deep-frozen) input', () => {
    const tree = makeTree()
    const snapshot = JSON.stringify(tree)
    updateBlockDeep(tree, text('deep-text', '<p>x</p>'))
    deleteBlockDeep(tree, 'sec-child')
    duplicateBlockDeep(tree, 'sec-outer')
    insertBlockDeep(tree, text('fresh'), 'sec-inner', 0)
    moveBlockDeep(tree, 'sec-inner', -1)
    expect(JSON.stringify(tree)).toBe(snapshot)
  })
})

// ---------------------------------------------------------------------------
// W1 (walidacja Iter 1): przypięcie OKABLOWANIA limitu głębokości do schematu.
// Sam util jest testowany wyżej — tu parsujemy realny payload przez
// updateEmailTemplateSchema, żeby usunięcie/przeniesienie superRefine
// natychmiast wywaliło test.
// ---------------------------------------------------------------------------

import { updateEmailTemplateSchema } from '../validation'
import { messages } from '@/lib/messages'

describe('updateEmailTemplateSchema — limit głębokości sekcji (schema-level)', () => {
  function payload(blocks: Block[]) {
    return { subject: 'Temat', blocks }
  }

  it('akceptuje sekcję-w-sekcji (depth 2)', () => {
    const blocks = [section('s1', [section('s2', [text('t')])])]
    expect(updateEmailTemplateSchema.safeParse(payload(blocks)).success).toBe(true)
  })

  it('odrzuca depth 3 z komunikatem sectionDepthExceeded', () => {
    const blocks = [section('s1', [section('s2', [section('s3', [text('t')])])])]
    const result = updateEmailTemplateSchema.safeParse(payload(blocks))
    expect(result.success).toBe(false)
    if (!result.success) {
      const depthIssue = result.error.issues.find(
        (issue) => issue.message === messages.validation.sectionDepthExceeded,
      )
      expect(depthIssue).toBeDefined()
    }
  })
})

describe('countBlocksDeep', () => {
  it('liczy WSZYSTKIE bloki włącznie z zagnieżdżonymi (sekcje + kolumny)', () => {
    // makeTree: top-1, sec-outer(sec-child, sec-inner(deep-text)), cols(col-left, col-right), top-2
    expect(countBlocksDeep(makeTree())).toBe(9)
  })

  it('pusta lista = 0, płaska lista = length', () => {
    expect(countBlocksDeep([])).toBe(0)
    expect(countBlocksDeep([text('a'), text('b')])).toBe(2)
  })

  it('pusta sekcja liczy się jako 1', () => {
    expect(countBlocksDeep([section('s', [])])).toBe(1)
  })
})

describe('insertExclusionsForDepth', () => {
  it('nie wyklucza sekcji poniżej limitu głębokości', () => {
    expect(insertExclusionsForDepth(0)).toEqual([])
    expect(insertExclusionsForDepth(MAX_SECTION_DEPTH - 1)).toEqual([])
  })

  it('wyklucza sekcję na (i powyżej) MAX_SECTION_DEPTH — wstawienie przekroczyłoby limit', () => {
    expect(insertExclusionsForDepth(MAX_SECTION_DEPTH)).toEqual(['section'])
    expect(insertExclusionsForDepth(MAX_SECTION_DEPTH + 1)).toEqual(['section'])
  })
})
