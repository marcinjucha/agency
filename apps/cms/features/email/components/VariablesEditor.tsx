import { Button, Input } from '@agency/ui'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { TemplateVariable } from '../types'
import { validateVariableKey } from '../utils/validate-variable-key'

interface VariablesEditorProps {
  variables: TemplateVariable[]
  onChange: (vars: TemplateVariable[]) => void
  /**
   * Keys auto-detected in subject + block content (client-side scan).
   * The Zmienne tab uses this to surface a "Wykryj z treści" action —
   * one-shot opt-in import of any `{{key}}`s present in content but
   * not yet in the variables list. User decides; auto-detect never
   * mutates the saved list silently.
   */
  detectedKeys?: ReadonlyArray<string>
}

export function VariablesEditor({ variables, onChange, detectedKeys = [] }: VariablesEditorProps) {
  function updateVariable(index: number, patch: Partial<TemplateVariable>) {
    onChange(variables.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function removeVariable(index: number) {
    onChange(variables.filter((_, i) => i !== index))
  }

  function handleAddManual() {
    onChange([...variables, { key: '', label: '', source: 'manual' }])
  }

  // Compute keys present in content but NOT yet in the variables list.
  // Trimmed because empty new rows have key="".
  const existingKeys = new Set(variables.map((v) => v.key.trim()).filter(Boolean))
  const missingFromContent = detectedKeys.filter((k) => !existingKeys.has(k))
  const canDetect = missingFromContent.length > 0

  function handleDetectFromContent() {
    if (!canDetect) return
    const additions: TemplateVariable[] = missingFromContent.map((key) => ({
      key,
      label: key,
      source: 'manual' as const,
    }))
    onChange([...variables, ...additions])
  }

  if (variables.length === 0) {
    return (
      <div>
        <VariablesEmptyState
          onAddManual={handleAddManual}
          onDetectFromContent={canDetect ? handleDetectFromContent : undefined}
          detectedCount={missingFromContent.length}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
        {variables.map((variable, index) => {
          const keyError = validateVariableKey(variable.key, index, variables)
          return (
            <VariableRow
              // Use index as key — `variable.key` is editable and may collide with
              // empty strings on freshly-added rows.
              key={index}
              variable={variable}
              index={index}
              isFirst={index === 0}
              keyError={keyError}
              onKeyChange={(key) => updateVariable(index, { key })}
              onLabelChange={(label) => updateVariable(index, { label })}
              onDescriptionChange={(description) => updateVariable(index, { description })}
              onRemove={() => removeVariable(index)}
            />
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddManual}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {messages.email.addVariable}
          </Button>
          {canDetect && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDetectFromContent}
              className="gap-1.5"
              title={`${messages.email.detectFromContentTooltip}: ${missingFromContent.map((k) => `{{${k}}}`).join(', ')}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {messages.email.detectFromContent} ({missingFromContent.length})
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/80">
          {messages.email.variableManualHint}
        </p>
      </div>
    </div>
  )
}

function VariablesEmptyState({
  onAddManual,
  onDetectFromContent,
  detectedCount,
}: {
  onAddManual: () => void
  onDetectFromContent?: () => void
  detectedCount: number
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/20 px-6 py-8 text-center">
      <code className="inline-block rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-foreground/70">
        {'{{nazwa}}'}
      </code>
      <p className="mt-3 text-xs text-muted-foreground">
        {messages.email.variableEmptyStateHint}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddManual}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {messages.email.addVariable}
        </Button>
        {onDetectFromContent && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDetectFromContent}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {messages.email.detectFromContent} ({detectedCount})
          </Button>
        )}
      </div>
    </div>
  )
}

interface VariableRowProps {
  variable: TemplateVariable
  index: number
  isFirst: boolean
  keyError: string | null
  onKeyChange: (key: string) => void
  onLabelChange: (label: string) => void
  onDescriptionChange: (description: string | undefined) => void
  onRemove: () => void
}

function VariableRow({
  variable,
  index,
  isFirst,
  keyError,
  onKeyChange,
  onLabelChange,
  onDescriptionChange,
  onRemove,
}: VariableRowProps) {
  const errorId = keyError ? `variable-${index}-key-error` : undefined
  const labelAria = `${messages.email.variableLabelGeneric} ${variable.key || `#${index + 1}`}`
  const descriptionAria = `${messages.email.variableDescriptionGeneric} ${variable.key || `#${index + 1}`}`

  // Stacked layout — all rows fully editable + deletable (AAA-T-221, 2026-05-15).
  // Row 1: editable {{key}} chip + delete button.
  // Row 2: full-width label input.
  // Row 3: full-width description input (quieter).
  // The previous AUTO/MANUAL badge is gone — every variable is user-managed.
  return (
    <div className={`group ${isFirst ? '' : 'border-t border-border/40'}`}>
      <div className="flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:bg-card/60 focus-within:bg-card/60">
        {/* Row 1 — editable key chip + delete */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={`flex items-center rounded border bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary focus-within:ring-1 focus-within:ring-primary/40 ${
              keyError ? 'border-destructive/60' : 'border-primary/25'
            }`}
          >
            <span className="text-primary/50">{'{{'}</span>
            <Input
              value={variable.key}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder={messages.email.variableKeyPlaceholder}
              aria-label={messages.email.variableKeyAriaLabel}
              aria-invalid={keyError ? true : undefined}
              aria-describedby={errorId}
              size={Math.max(8, variable.key.length + 2)}
              className="h-5 w-auto min-w-[80px] max-w-[200px] border-none bg-transparent p-0 text-[11px] font-mono font-semibold text-primary placeholder:text-primary/40 focus-visible:ring-0"
            />
            <span className="text-primary/50">{'}}'}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={messages.email.variableRemove}
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Row 2 — label (full panel width) */}
        <Input
          value={variable.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={messages.email.variableLabelPlaceholder}
          aria-label={labelAria}
          maxLength={200}
          className="h-7 w-full border-transparent bg-transparent text-xs placeholder:text-muted-foreground/60 focus-visible:border-border focus-visible:bg-background"
        />

        {/* Row 3 — description (full panel width, quieter) */}
        <Input
          value={variable.description ?? ''}
          onChange={(e) => {
            const val = e.target.value
            onDescriptionChange(val.length > 0 ? val : undefined)
          }}
          placeholder={messages.email.variableDescriptionPlaceholder}
          aria-label={descriptionAria}
          maxLength={500}
          className="h-7 w-full border-transparent bg-transparent text-[11px] text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:border-border focus-visible:bg-background"
        />
      </div>

      {keyError && (
        <p
          id={errorId}
          role="status"
          className="px-3 pb-2 text-xs text-destructive"
        >
          {keyError}
        </p>
      )}
    </div>
  )
}
