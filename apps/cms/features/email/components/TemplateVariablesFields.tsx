import { useId } from 'react'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { TemplateVariableField } from '../utils/resolve-template-variables'

// ---------------------------------------------------------------------------
// TemplateVariablesFields — REUSABLE presentational editor for "fill this
// template's variables with literal values" (Iter 3b).
//
// ZERO knowledge of any consuming feature: no data fetching, no save, no
// campaign/venture specifics. The parent owns the fetch (which fields) AND the
// persistence (where the values go). This component only renders one labelled
// input per variable and reports edits through `onChange`. That parent/child
// split is the reuse seam (SRP-by-actor) — any surface that needs to bind
// literal values to a template's {{tokens}} can drop this in.
//
// EXTENSION POINT (open/closed): the value control is currently a plain text
// Input. A future variant (media picker, data-source binding, per-type control)
// belongs HERE — swap `renderValueControl` for a registry keyed on a future
// `field.control` discriminator. Do NOT branch on the consuming feature.
// ---------------------------------------------------------------------------

interface TemplateVariablesFieldsProps {
  variables: TemplateVariableField[]
  /** Flat map of { templateTokenKey: literalValue }. Missing key → empty input. */
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  disabled?: boolean
}

export function TemplateVariablesFields({
  variables,
  values,
  onChange,
  disabled = false,
}: TemplateVariablesFieldsProps) {
  if (variables.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{messages.email.templateVariablesEmpty}</p>
    )
  }

  function handleFieldChange(key: string, value: string) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{messages.email.templateVariablesHint}</p>
      {variables.map((field) => (
        <TemplateVariableRow
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          onChange={(value) => handleFieldChange(field.key, value)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

interface TemplateVariableRowProps {
  field: TemplateVariableField
  value: string
  onChange: (value: string) => void
  disabled: boolean
}

function TemplateVariableRow({ field, value, onChange, disabled }: TemplateVariableRowProps) {
  // useId keeps the label/input association unique across multiple mounted
  // instances of this reusable component (two editors on one page would
  // otherwise collide on `template-variable-<key>`).
  const uid = useId()
  const inputId = `template-variable-${uid}-${field.key}`
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {field.label ?? field.key}
        </Label>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {`{{${field.key}}}`}
        </code>
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {/* EXTENSION POINT: value control (plain text today). */}
      <Input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={messages.email.templateVariablesValuePlaceholder}
        disabled={disabled}
        className="text-sm"
      />
    </div>
  )
}
