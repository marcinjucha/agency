import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@agency/ui'
import { LayoutGrid } from 'lucide-react'
import { BlockList } from './BlockList'
import { BlockPalette } from './BlockPalette'
import { EmailPreview } from './EmailPreview'
import { VariableInserter } from './VariableInserter'
import { VariablesEditor } from './VariablesEditor'
import { DEFAULT_BLOCKS } from '../constants'
import type { Block, BlockType, EmailTemplate, EmailTemplateType, TemplateVariable } from '../types'
import { updateEmailTemplateFn, resetEmailTemplateToDefaultFn, parseTemplateVariables } from '../server'
import { messages } from '@/lib/messages'
import { getTriggerVariables } from '@/lib/trigger-schemas'
import { CMS_BLOCK_REGISTRY } from '../block-registry'
import { extractTemplateVariableKeys } from '../utils/extract-variable-keys'
import { queryKeys } from '@/lib/query-keys'

interface EmailTemplateEditorProps {
  templateType: string
  initialTemplate: EmailTemplate | null
}

export function EmailTemplateEditor({ templateType, initialTemplate }: EmailTemplateEditorProps) {
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState(initialTemplate?.subject ?? '')
  const [blocks, setBlocks] = useState<Block[]>(initialTemplate?.blocks ?? DEFAULT_BLOCKS)
  const [userEditedVariables, setUserEditedVariables] = useState<TemplateVariable[]>(
    () => parseTemplateVariables(initialTemplate?.template_variables)
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paletteSheetOpen, setPaletteSheetOpen] = useState(false)

  // Sync state when initialTemplate loads asynchronously (prefetchQuery is non-blocking)
  useEffect(() => {
    if (initialTemplate) {
      setSubject(initialTemplate.subject ?? '')
      setBlocks(initialTemplate.blocks ?? DEFAULT_BLOCKS)
      setUserEditedVariables(parseTemplateVariables(initialTemplate.template_variables))
    }
  }, [initialTemplate])

  // Auto-detect variables from current content (subject + blocks).
  // Merge detected keys with user-edited labels so UI shows up-to-date variable list.
  // React Compiler auto-memoizuje — useMemo zbędny (project rule: no manual memoization).
  const detectedVariableKeys = extractTemplateVariableKeys(subject, blocks)

  const mergedVariables: TemplateVariable[] = detectedVariableKeys.map((key) => {
    const existing = userEditedVariables.find((v) => v.key === key)
    return existing ?? { key, label: key, source: 'trigger' }
  })

  const variables = getTriggerVariables(templateType)
  const subjectRef = useRef<HTMLInputElement>(null)

  function addBlock(type: BlockType) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry) return

    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as Block
    setBlocks((prev) => [...prev, newBlock])

    // Zamknij Sheet na mobile po dodaniu bloku
    setPaletteSheetOpen(false)
  }

  async function resetToDefaults() {
    setSaveState('saving')
    setErrorMessage(null)
    try {
      const result = await resetEmailTemplateToDefaultFn({ data: { type: templateType as EmailTemplateType } })
      if (result.success) {
        setBlocks(DEFAULT_BLOCKS)
        setSubject('Dziękujemy za wypełnienie formularza - {{surveyTitle}}')
        setSaveState('saved')
      } else {
        setSaveState('error')
        setErrorMessage(result.error ?? null)
      }
    } catch (err) {
      setSaveState('error')
      setErrorMessage(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  async function handleSave() {
    setSaveState('saving')
    setErrorMessage(null)
    try {
      const result = await updateEmailTemplateFn({
        data: {
          type: templateType as EmailTemplateType,
          data: { subject, blocks, template_variables: mergedVariables },
        },
      })
      setSaveState(result.success ? 'saved' : 'error')
      if (result.success) {
        // Unieważnij cache email-templates i workflows (Send Email config panel korzysta z listy szablonów)
        void queryClient.invalidateQueries({ queryKey: queryKeys.email.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
      } else {
        setErrorMessage(result.error ?? null)
      }
    } catch (err) {
      setSaveState('error')
      setErrorMessage(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const saveLabel = {
    idle: messages.common.save,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }[saveState]

  return (
    <div className="mx-auto max-w-[1400px] flex flex-col gap-6">
      {/* Temat emaila — pełna szerokość */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-subject">{messages.email.subjectLabel}</Label>
          <VariableInserter
            variables={variables}
            inputRef={subjectRef}
            onChange={setSubject}
            currentValue={subject}
          />
        </div>
        <Input
          ref={subjectRef}
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={messages.email.subjectPlaceholder}
        />
      </div>

      {/* Zmienne szablonu */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          Zmienne szablonu
        </p>
        <VariablesEditor
          variables={mergedVariables}
          onChange={setUserEditedVariables}
        />
      </div>

      {/* --- Layout responsywny --- */}

      {/* xl (≥1280px): 3 kolumny — paleta | edytor | podgląd */}
      <div className="hidden xl:grid xl:grid-cols-[260px_1fr_440px] xl:gap-4 min-h-[600px]">
        {/* Kolumna 1: Paleta bloków */}
        <div className="overflow-y-auto border-r border-border pr-4">
          <BlockPalette onAddBlock={addBlock} />
        </div>

        {/* Kolumna 2: Lista bloków */}
        <div className="overflow-y-auto px-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">
            {messages.email.blocksLabel}
          </p>
          <BlockList blocks={blocks} onChange={setBlocks} variables={variables} />
        </div>

        {/* Kolumna 3: Podgląd emaila */}
        <div className="border-l border-border pl-4">
          <ScaledEmailPreview blocks={blocks} />
        </div>
      </div>

      {/* lg (≥1024px, <1280px): 2 kolumny — edytor | podgląd + Sheet trigger dla palety */}
      <div className="hidden lg:grid xl:hidden lg:grid-cols-[1fr_440px] lg:gap-4 min-h-[600px]">
        {/* Edytor z Sheet triggerem dla palety */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              {messages.email.blocksLabel}
            </p>
            <Sheet open={paletteSheetOpen} onOpenChange={setPaletteSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Dodaj blok
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Bloki emaila</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-y-auto">
                  <BlockPalette onAddBlock={addBlock} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="overflow-y-auto">
            <BlockList blocks={blocks} onChange={setBlocks} variables={variables} />
          </div>
        </div>

        {/* Podgląd */}
        <div className="border-l border-border pl-4">
          <ScaledEmailPreview blocks={blocks} />
        </div>
      </div>

      {/* <lg (mobile): 1 kolumna + Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="editor">
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="editor">Edytor</TabsTrigger>
              <TabsTrigger value="preview">Podgląd</TabsTrigger>
            </TabsList>

            <Sheet open={paletteSheetOpen} onOpenChange={setPaletteSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Dodaj blok
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Bloki emaila</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-y-auto h-full pb-8">
                  <BlockPalette onAddBlock={addBlock} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <TabsContent value="editor" className="mt-0">
            <BlockList blocks={blocks} onChange={setBlocks} variables={variables} />
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <EmailPreview blocks={blocks} className="min-h-[500px]" />
          </TabsContent>
        </Tabs>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saveState === 'saving'}>
          {saveLabel}
        </Button>
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="text-destructive border-destructive/40 hover:bg-destructive/5"
        >
          {messages.email.restoreDefaults}
        </Button>
        {saveState === 'error' && (
          <p className="text-sm text-destructive">
            {messages.email.templateSaveFailed}
            {errorMessage && (
              <span className="block mt-1 text-xs opacity-75">{errorMessage}</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

// --- Skalowany podgląd emaila ---
// Email standard width = 600px, skalowany do kontenera 440px
// scale = 440/600 = 0.733...

function ScaledEmailPreview({ blocks }: { blocks: Block[] }) {
  const SCALE = 440 / 600
  // Wysokość kontenera = skalowana wysokość iframe (600px * SCALE w pionie to za mało,
  // używamy overflow + stałej wysokości żeby podgląd był czytelny)
  const CONTAINER_HEIGHT = 700

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Podgląd
        </span>
        <span className="text-xs text-muted-foreground">600px email</span>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border bg-white"
        style={{ height: CONTAINER_HEIGHT }}
        aria-label="Podgląd emaila w skali"
      >
        <div
          style={{
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            width: `${100 / SCALE}%`,
            height: `${CONTAINER_HEIGHT / SCALE}px`,
          }}
        >
          <EmailPreview
            blocks={blocks}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}
