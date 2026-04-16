

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CollapsibleCard,
  Input,
  Label,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@agency/ui'
import type { LandingBlock, SeoMetadata } from '@agency/database'
import { DEFAULT_BLOCKS, BLOCK_TYPE_LABELS } from '@agency/database'
import { BlockFieldEditor } from './BlockFieldEditor'
import type { LandingPage } from '../types'
import { KeywordSelect } from '@/features/site-settings/components/KeywordSelect'
import { getKeywordPoolFn } from '@/features/site-settings/server'
import { siteSettingsKeys } from '@/features/site-settings/types'
import { messages } from '@/lib/messages'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface LandingPageEditorProps {
  page: LandingPage | null | undefined
  isLoading: boolean
  error: Error | null
  saveFn: (
    id: string,
    data: { blocks?: LandingBlock[]; seo_metadata?: SeoMetadata; is_published?: boolean }
  ) => Promise<{ success: boolean; error?: string }>
}

export function LandingPageEditor({ page, isLoading, error, saveFn }: LandingPageEditorProps) {
  const { data: keywordPool = [], isLoading: isPoolLoading } = useQuery({
    queryKey: siteSettingsKeys.keywordPool,
    queryFn: async () => {
      const res = await getKeywordPoolFn()
      return res.success ? res.data : []
    },
  })

  const [blocks, setBlocks] = useState<LandingBlock[] | null>(null)
  const [seo, setSeo] = useState<SeoMetadata>({
    title: '',
    description: '',
    ogImage: '',
    keywords: [],
  })
  const [isPublished, setIsPublished] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Initialise local state from fetched data (once, on first load)
  useEffect(() => {
    if (page && blocks === null) {
      setBlocks(page.blocks?.length ? page.blocks : DEFAULT_BLOCKS)
      setSeo(page.seo_metadata ?? { title: '', description: '', ogImage: '', keywords: [] })
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
      const result = await saveFn(page.id, {
        blocks: activeBlocks,
        seo_metadata: activeSeo,
        is_published: activePublished,
      })
      setSaveState(result.success ? 'saved' : 'error')
    } catch (err) {
      console.error('[LandingPage] Save failed:', err)
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
      <div className="mx-auto max-w-[1400px]">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-3 w-16 rounded bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-48 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm text-destructive font-medium">{messages.landing.loadFailed}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px]">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      {/* LEFT COLUMN — Block content editing */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          {messages.landing.sectionsLabel}
        </p>
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
                  aria-label={
                    expandedIndex === index ? messages.landing.collapse : messages.landing.expand
                  }
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

      {/* RIGHT COLUMN — Sidebar (SEO + Settings + Save) */}
      <div className="flex flex-col gap-6">
        {/* SEO card */}
        <CollapsibleCard title={messages.landing.seoCardTitle} defaultOpen={false}>
          <div className="space-y-5">
            <TooltipProvider delayDuration={300}>
              {/* SEO Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="seo-title" className="text-sm font-medium">
                    {messages.landing.pageTitle}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={messages.landing.pageTitleTooltip}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{messages.landing.pageTitleTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="seo-title"
                  value={activeSeo.title ?? ''}
                  onChange={(e) => setSeo((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={messages.landing.pageTitlePlaceholder}
                  className="text-sm"
                />
              </div>

              {/* SEO Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="seo-description" className="text-sm font-medium">
                      {messages.landing.pageDescription}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={messages.landing.pageDescriptionTooltip}
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{messages.landing.pageDescriptionTooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeSeo.description?.length ?? 0}/160
                  </span>
                </div>
                <Textarea
                  id="seo-description"
                  value={activeSeo.description ?? ''}
                  onChange={(e) => setSeo((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={messages.landing.pageDescriptionPlaceholder}
                  rows={4}
                  autoResize
                  className="resize-none text-sm"
                  maxLength={160}
                />
              </div>

              {/* OG Image URL */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="seo-og-image" className="text-sm font-medium">
                    {messages.landing.ogImageLabel}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={messages.landing.ogImageTooltip}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{messages.landing.ogImageTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="seo-og-image"
                  value={activeSeo.ogImage ?? ''}
                  onChange={(e) => setSeo((prev) => ({ ...prev, ogImage: e.target.value }))}
                  placeholder="https://…"
                  className="text-sm"
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="seo-keywords" className="text-sm font-medium">
                    {messages.landing.keywordsLabel}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={messages.landing.keywordsTooltip}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{messages.landing.keywordsTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <KeywordSelect
                  id="seo-keywords"
                  value={activeSeo.keywords ?? []}
                  onChange={(keywords) => setSeo((prev) => ({ ...prev, keywords }))}
                  pool={keywordPool}
                  isLoading={isPoolLoading}
                />
              </div>
            </TooltipProvider>
          </div>
        </CollapsibleCard>

        {/* Settings card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              {messages.landing.settingsCardTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="landing-publish" className="text-sm font-medium cursor-pointer">
                {activePublished ? messages.landing.publishedLabel : messages.landing.draftLabel}
              </Label>
              <Switch
                id="landing-publish"
                checked={activePublished}
                onCheckedChange={setIsPublished}
                aria-label={messages.landing.publishPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex flex-col gap-2">
          {saveState === 'error' && (
            <p className="text-sm text-destructive">{messages.landing.saveFailed}</p>
          )}
          <Button
            onClick={handleSave}
            disabled={saveState === 'saving' || !page}
            className={`w-full ${saveState === 'saved' ? 'bg-primary/80' : ''}`}
          >
            {saveLabel[saveState]}
          </Button>
        </div>
      </div>
    </div>
    </div>
  )
}
