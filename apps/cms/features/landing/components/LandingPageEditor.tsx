'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@agency/ui'
import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import type { LandingBlock, SeoMetadata } from '@agency/database'
import { DEFAULT_BLOCKS, BLOCK_TYPE_LABELS } from '@agency/database'
import { getLandingPage } from '../queries'
import { BlockFieldEditor } from './BlockFieldEditor'
import { updateLandingPage } from '../actions'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

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
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-lg bg-muted" />
            <div className="h-10 rounded-lg bg-muted" />
          </div>
          <div className="h-10 rounded-lg bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-16 rounded bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm text-destructive font-medium">
          Nie udało się załadować strony. Odśwież i spróbuj ponownie.
        </p>
      </div>
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
            <div
              key={index}
              className={`border rounded-lg transition-colors ${
                expandedIndex === index
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* Block header row */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums w-6">
                  {index + 1}.
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {BLOCK_TYPE_LABELS[block.type]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={expandedIndex === index ? 'Zwiń' : 'Rozwiń'}
                  onClick={() => setExpandedIndex((prev) => (prev === index ? null : index))}
                >
                  {expandedIndex === index ? '▲' : '▼'}
                </Button>
              </div>

              {/* Block editor (expanded) */}
              {expandedIndex === index && (
                <div className="border-t border-border/50 px-4 py-4">
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

      {/* Publish toggle + save */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            role="switch"
            aria-checked={activePublished}
            aria-label="Publikuj stronę"
            tabIndex={0}
            onClick={() => setIsPublished(!activePublished)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setIsPublished(!activePublished)
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              activePublished ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                activePublished ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            {activePublished ? 'Opublikowana' : 'Szkic'}
          </span>
        </label>

        <div className="flex items-center gap-3">
          {saveState === 'error' && (
            <p className="text-sm text-destructive">
              Nie udało się zapisać.
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={saveState === 'saving' || !page}
            className={
              saveState === 'saved'
                ? 'bg-primary/80'
                : undefined
            }
          >
            {saveLabel[saveState]}
          </Button>
        </div>
      </div>
    </div>
  )
}
