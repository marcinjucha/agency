

import { useState } from 'react'
import { ChevronRight, PanelLeftClose, Search, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, Input } from '@agency/ui'
import { cn } from '@agency/ui'
import { messages } from '@/lib/messages'
import { NODE_TYPE_CONFIGS, PLACEHOLDER_ICON_MAP } from './nodes/node-registry'
import type { NodeTypeConfig } from './nodes/node-registry'
import { PLACEHOLDER_REGISTRY } from '../step-registry'
import type { PlaceholderStepDefinition } from '../step-registry'


const STEP_CATEGORIES = [
  {
    key: 'triggers',
    label: messages.workflows.stepLibrary.categoryTriggers,
  },
  {
    key: 'actions',
    label: messages.workflows.stepLibrary.categoryActions,
  },
  {
    key: 'logic',
    label: messages.workflows.stepLibrary.categoryLogic,
  },
  {
    key: 'ai',
    label: messages.workflows.stepLibrary.categoryAi,
  },
] as const

function getStepsByCategory(categoryKey: string): [string, NodeTypeConfig][] {
  return Object.entries(NODE_TYPE_CONFIGS).filter(
    ([, config]) => config.category === categoryKey
  )
}

interface StepLibraryPanelProps {
  isOpen: boolean
  onClose?: () => void
}

function StepLibraryItem({
  stepType,
  config,
}: {
  stepType: string
  config: NodeTypeConfig
}) {
  const Icon = config.icon

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/workflow-step', stepType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-foreground">
          {config.label}
        </p>
        {config.description && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {config.description}
          </p>
        )}
      </div>
    </div>
  )
}

function PlaceholderStepLibraryItem({ def }: { def: PlaceholderStepDefinition }) {
  const Icon = PLACEHOLDER_ICON_MAP[def.iconName] ?? Zap

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/workflow-step', def.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-foreground">
          {def.label}
        </p>
        {def.description && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {def.description}
          </p>
        )}
      </div>
    </div>
  )
}

function AdditionalCategorySection() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-1.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isOpen && 'rotate-90'
          )}
        />
        {messages.workflows.stepLibrary.categoryAdditional}
      </button>
      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
          {PLACEHOLDER_REGISTRY.map((def) => (
            <PlaceholderStepLibraryItem key={def.id} def={def} />
          ))}
        </div>
      )}
    </div>
  )
}

function CategorySection({
  label,
  categoryKey,
}: {
  label: string
  categoryKey: string
}) {
  const [isOpen, setIsOpen] = useState(true)
  const steps = getStepsByCategory(categoryKey)

  if (steps.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-1.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isOpen && 'rotate-90'
          )}
        />
        {label}
      </button>
      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
          {steps.map(([stepType, config]) => (
            <StepLibraryItem
              key={stepType}
              stepType={stepType}
              config={config}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchResults({ query }: { query: string }) {
  const q = query.toLowerCase()

  const regularMatches = Object.entries(NODE_TYPE_CONFIGS).filter(
    ([, config]) =>
      config.label.toLowerCase().includes(q) ||
      (config.description?.toLowerCase().includes(q) ?? false)
  )

  const placeholderMatches = PLACEHOLDER_REGISTRY.filter(
    (def) =>
      def.label.toLowerCase().includes(q) ||
      (def.description?.toLowerCase().includes(q) ?? false)
  )

  const hasResults = regularMatches.length > 0 || placeholderMatches.length > 0

  if (!hasResults) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Brak wyników dla &quot;{query}&quot;
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {regularMatches.map(([stepType, config]) => (
        <StepLibraryItem key={stepType} stepType={stepType} config={config} />
      ))}
      {placeholderMatches.map((def) => (
        <PlaceholderStepLibraryItem key={def.id} def={def} />
      ))}
    </div>
  )
}

export function StepLibraryPanel({ isOpen, onClose }: StepLibraryPanelProps) {
  const [search, setSearch] = useState('')

  return (
    <div
      className={cn(
        'h-full border-r border-border bg-background overflow-y-auto transition-[width,opacity] duration-200 ease-in-out',
        isOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {messages.workflows.editor.stepLibrary}
          </h3>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={messages.workflows.stepLibrary.searchPlaceholder}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {search.trim() !== '' ? (
          <SearchResults query={search.trim()} />
        ) : (
          <>
            {STEP_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat.key}
                label={cat.label}
                categoryKey={cat.key}
              />
            ))}
            <AdditionalCategorySection />
          </>
        )}
      </div>
    </div>
  )
}
