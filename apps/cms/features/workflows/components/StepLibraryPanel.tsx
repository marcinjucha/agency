

import { useState } from 'react'
import { ChevronRight, PanelLeftClose } from 'lucide-react'
import { Button } from '@agency/ui'
import { cn } from '@agency/ui'
import { messages } from '@/lib/messages'
import { NODE_TYPE_CONFIGS } from './nodes/node-registry'
import type { NodeTypeConfig } from './nodes/node-registry'

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

export function StepLibraryPanel({ isOpen, onClose }: StepLibraryPanelProps) {
  return (
    <div
      className={cn(
        'h-full border-r border-border bg-background overflow-y-auto transition-[width,opacity] duration-200 ease-in-out',
        isOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden'
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
        {STEP_CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            label={cat.label}
            categoryKey={cat.key}
          />
        ))}
      </div>
    </div>
  )
}
