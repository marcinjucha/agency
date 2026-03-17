'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@agency/ui'
import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import type { LandingBlock, LandingBlockType } from '@agency/database'
import { DEFAULT_BLOCKS, BLOCK_TYPE_LABELS } from '@agency/database'
import { getLandingPage } from '../queries'
import type { SeoMetadata } from '../queries'
import { BlockFieldEditor } from './BlockFieldEditor'
import { updateLandingPage } from '../actions'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function createEmptyBlock(type: LandingBlockType): LandingBlock {
  switch (type) {
    case 'navbar':
      return { type: 'navbar', ctaText: '', ctaHref: '' }
    case 'hero':
      return {
        type: 'hero',
        metric1Value: '',
        metric1Label: '',
        metric2Value: '',
        metric2Label: '',
        qualifiers: [],
        badNews: '',
        goodNews: '',
        valueProp: '',
        guarantee: '',
        cta: '',
      }
    case 'problems':
      return { type: 'problems', title: '', stat: '', items: [], framing: '', hook: '' }
    case 'guarantee':
      return {
        type: 'guarantee',
        badge: '',
        headline: '',
        headline2: '',
        description: '',
        steps: [],
        proof: '',
      }
    case 'riskReversal':
      return {
        type: 'riskReversal',
        title: '',
        step1Label: '',
        step1Text: '',
        step2Label: '',
        step2Text: '',
        closing: '',
        bold: '',
        transparency: '',
      }
    case 'benefits':
      return { type: 'benefits', title: '', items: [], closing: '' }
    case 'qualification':
      return { type: 'qualification', title: '', items: [], separator: '', techItem: '' }
    case 'cta':
      return { type: 'cta', headline: '', description: '', button: '', subtext: '' }
    case 'footer':
      return { type: 'footer', description: '', privacy: '', terms: '', copyright: '' }
  }
}

export function LandingPageEditor() {
  const queryClient = useQueryClient()
  const { data: page, isLoading, error } = useQuery({
    queryKey: ['landing-page'],
    queryFn: getLandingPage,
  })

  const [blocks, setBlocks] = useState<LandingBlock[] | null>(null)
  const [seo, setSeo] = useState<SeoMetadata>({ title: '', description: '', ogImage: '' })
  const [isPublished, setIsPublished] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [addBlockType, setAddBlockType] = useState<LandingBlockType | ''>('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Initialise local state from fetched data (once, on first load)
  useEffect(() => {
    if (page && blocks === null) {
      setBlocks(page.blocks?.length ? page.blocks : DEFAULT_BLOCKS)
      setSeo(page.seo_metadata ?? { title: '', description: '', ogImage: '' })
      setIsPublished(page.is_published ?? false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const activeBlocks = blocks ?? DEFAULT_BLOCKS
  const activeSeo = seo
  const activePublished = isPublished

  function updateBlock(index: number, updated: LandingBlock) {
    setBlocks((prev) => {
      const next = [...(prev ?? activeBlocks)]
      next[index] = updated
      return next
    })
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    setBlocks((prev) => {
      const next = [...(prev ?? activeBlocks)]
      const target = direction === 'up' ? index - 1 : index + 1
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setExpandedIndex((prev) => {
      if (prev === index) return direction === 'up' ? index - 1 : index + 1
      if (direction === 'up' && prev === index - 1) return index
      if (direction === 'down' && prev === index + 1) return index
      return prev
    })
  }

  function deleteBlock(index: number) {
    setBlocks((prev) => {
      const next = [...(prev ?? activeBlocks)]
      next.splice(index, 1)
      return next
    })
    setExpandedIndex((prev) => {
      if (prev === index) return null
      if (prev !== null && prev > index) return prev - 1
      return prev
    })
  }

  function addBlock() {
    if (!addBlockType) return
    const newBlock = createEmptyBlock(addBlockType)
    const newIndex = activeBlocks.length
    setBlocks((prev) => [...(prev ?? activeBlocks), newBlock])
    setExpandedIndex(newIndex)
    setAddBlockType('')
  }

  async function handleSave() {
    if (!page) return
    setSaveState('saving')
    try {
      const result = await updateLandingPage(page.id, {
        blocks: activeBlocks,
        seo_metadata: activeSeo,
        is_published: activePublished,
      })
      if (result.success) {
        setSaveState('saved')
        queryClient.invalidateQueries({ queryKey: ['landing-page'] })
      } else {
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const saveLabel: Record<SaveState, string> = {
    idle: 'Zapisz',
    saving: 'Zapisywanie…',
    saved: 'Zapisano',
    error: 'Błąd zapisu',
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Ładowanie…</p>
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Nie udało się załadować strony. Odśwież i spróbuj ponownie.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* SEO section */}
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">SEO</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="seo-title">Tytuł strony</Label>
            <Input
              id="seo-title"
              value={activeSeo.title}
              onChange={(e) => setSeo((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Tytuł widoczny w wynikach wyszukiwania"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-og-image">OG Image URL</Label>
            <Input
              id="seo-og-image"
              value={activeSeo.ogImage ?? ''}
              onChange={(e) => setSeo((prev) => ({ ...prev, ogImage: e.target.value }))}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seo-description">Opis strony</Label>
          <Input
            id="seo-description"
            value={activeSeo.description}
            onChange={(e) => setSeo((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Krótki opis widoczny w wynikach wyszukiwania"
          />
        </div>
      </section>

      {/* Blocks list */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Sekcje</p>
        <div className="flex flex-col gap-2">
          {activeBlocks.map((block, index) => (
            <div key={index} className="border border-border rounded-md">
              {/* Block header row */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="flex-1 text-sm font-medium">
                  {BLOCK_TYPE_LABELS[block.type]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Przesuń w górę"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, 'up')}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Przesuń w dół"
                  disabled={index === activeBlocks.length - 1}
                  onClick={() => moveBlock(index, 'down')}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Usuń sekcję"
                  onClick={() => deleteBlock(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Usuń
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={expandedIndex === index ? 'Zwiń' : 'Rozwiń'}
                  onClick={() => setExpandedIndex((prev) => (prev === index ? null : index))}
                >
                  {expandedIndex === index ? '▲' : '▼'}
                </Button>
              </div>

              {/* Block editor (expanded) */}
              {expandedIndex === index && (
                <div className="border-t border-border px-4 py-4">
                  <BlockFieldEditor
                    block={block}
                    onChange={(updated) => updateBlock(index, updated)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Add block */}
      <div className="flex items-center gap-3">
        <Select
          value={addBlockType}
          onValueChange={(val) => setAddBlockType(val as LandingBlockType)}
        >
          <SelectTrigger className="w-56" aria-label="Wybierz typ sekcji">
            <SelectValue placeholder="Wybierz typ sekcji" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(BLOCK_TYPE_LABELS) as [LandingBlockType, string][]).map(
              ([type, label]) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={addBlock} disabled={!addBlockType}>
          Dodaj sekcję
        </Button>
      </div>

      {/* Publish toggle + save */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activePublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 accent-primary"
            aria-label="Publikuj stronę"
          />
          <span className="text-sm">Publikuj stronę</span>
        </label>

        <Button onClick={handleSave} disabled={saveState === 'saving' || !page}>
          {saveLabel[saveState]}
        </Button>

        {saveState === 'error' && (
          <p className="text-sm text-destructive">
            Nie udało się zapisać. Spróbuj ponownie.
          </p>
        )}
      </div>
    </div>
  )
}
