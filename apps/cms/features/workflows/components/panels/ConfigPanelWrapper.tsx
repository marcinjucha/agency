

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button, Input, Label } from '@agency/ui'
import { X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { isValidSlugFormat } from '../../utils/slug'
import { NODE_TYPE_CONFIGS, lookupNodeConfig } from '../nodes/node-registry'

interface ConfigPanelWrapperProps {
  nodeId: string
  stepType: string
  /** Current slug shown in the rename input. Undefined for trigger node. */
  slug?: string
  /**
   * Commit a slug rename. Returns Promise resolving to:
   * - { ok: true } on success
   * - { ok: false, error } on validation/server failure (input reverts, error shown inline)
   *
   * If undefined, slug input is hidden (e.g. for trigger node).
   */
  onSlugCommit?: (newSlug: string) => Promise<{ ok: true } | { ok: false; error: string }>
  onClose: () => void
  /** Current step config — used to read/write `_name` for the canvas display label. */
  stepConfig: Record<string, unknown>
  /** Called immediately on every `_name` keystroke — updates canvas label in real-time. */
  onStepConfigChange: (config: Record<string, unknown>) => void
  children: React.ReactNode
}

function getNodeConfig(stepType: string) {
  return lookupNodeConfig(stepType) ?? NODE_TYPE_CONFIGS['trigger']
}

export function ConfigPanelWrapper({
  nodeId: _nodeId,
  stepType,
  slug,
  onSlugCommit,
  onClose,
  stepConfig,
  onStepConfigChange,
  children,
}: ConfigPanelWrapperProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const config = getNodeConfig(stepType)
  const Icon = config.icon

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown as unknown as EventListener)
    return () => window.removeEventListener('keydown', handleKeyDown as unknown as EventListener)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="w-[560px] min-w-[560px] h-full flex flex-col bg-background border-l border-border animate-in slide-in-from-right-4 duration-200"
      role="complementary"
      aria-label={messages.workflows.editor.configPanel}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center h-8 w-8 rounded-md bg-muted ${config.borderColor}`}>
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {config.label}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {messages.workflows.editor.configPanel}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label={messages.workflows.editor.configPanelClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <StepNameField
          stepType={stepType}
          stepConfig={stepConfig}
          onStepConfigChange={onStepConfigChange}
        />

        {onSlugCommit && (
          <SlugRenameField slug={slug ?? ''} onCommit={onSlugCommit} />
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  )
}

interface StepNameFieldProps {
  stepType: string
  stepConfig: Record<string, unknown>
  onStepConfigChange: (config: Record<string, unknown>) => void
}

/**
 * Controlled display-name input for the canvas node label.
 * Updates immediately on every keystroke — no commit-on-blur.
 * Clearing the value removes `_name` from step_config so the canvas
 * falls back to the generic type label.
 */
function StepNameField({ stepType, stepConfig, onStepConfigChange }: StepNameFieldProps) {
  const config = getNodeConfig(stepType)
  const inputId = 'config-panel-step-name-input'

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value === '') {
      const { _name: _removed, ...rest } = stepConfig
      onStepConfigChange(rest)
    } else {
      onStepConfigChange({ ...stepConfig, _name: value })
    }
  }

  return (
    <div className="mt-3">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {messages.workflows.editor.stepNameLabel}
      </Label>
      <Input
        id={inputId}
        value={(stepConfig._name as string) ?? ''}
        onChange={handleChange}
        placeholder={config.label}
        className="mt-1 h-8 text-sm"
      />
    </div>
  )
}

interface SlugRenameFieldProps {
  slug: string
  onCommit: (newSlug: string) => Promise<{ ok: true } | { ok: false; error: string }>
}

/**
 * Inline slug rename input.
 * Commits on blur or Enter. Shows server-returned error inline; reverts to last
 * persisted value on cancel (Escape) or after a failed commit.
 */
function SlugRenameField({ slug, onCommit }: SlugRenameFieldProps) {
  const [value, setValue] = useState(slug)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Sync external slug changes (e.g. server-side normalization, parent-driven updates).
  useEffect(() => {
    setValue(slug)
    setError(null)
  }, [slug])

  async function commit() {
    const trimmed = value.trim()
    if (trimmed === slug) {
      setError(null)
      return
    }
    if (trimmed.length === 0) {
      setError(messages.workflows.editor.slugEmpty)
      setValue(slug)
      return
    }
    if (!isValidSlugFormat(trimmed)) {
      setError(messages.workflows.editor.slugInvalidFormat)
      return
    }
    setIsSaving(true)
    setError(null)
    const result = await onCommit(trimmed)
    setIsSaving(false)
    if (!result.ok) {
      setError(result.error)
      setValue(slug)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.currentTarget as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setValue(slug)
      setError(null)
      ;(e.currentTarget as HTMLInputElement).blur()
    }
  }

  const inputId = 'config-panel-slug-input'

  return (
    <div className="mt-3">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {messages.workflows.editor.slugLabel}
      </Label>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
        className="mt-1 h-8 font-mono text-sm"
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted-foreground">
          {messages.workflows.editor.slugHint}
        </p>
      )}
    </div>
  )
}
