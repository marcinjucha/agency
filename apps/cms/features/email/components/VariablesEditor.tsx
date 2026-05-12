import { Input, Label } from '@agency/ui'
import type { TemplateVariable } from '../types'

interface VariablesEditorProps {
  variables: TemplateVariable[]
  onChange: (vars: TemplateVariable[]) => void
}

export function VariablesEditor({ variables, onChange }: VariablesEditorProps) {
  if (variables.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4">
        <p className="text-xs text-muted-foreground text-center">
          Dodaj <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{'{{zmienną}}'}</code> do treści szablonu,
          aby była widoczna tutaj
        </p>
      </div>
    )
  }

  function updateVariable(index: number, patch: Partial<TemplateVariable>) {
    const updated = variables.map((v, i) => (i === index ? { ...v, ...patch } : v))
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {variables.map((variable, index) => (
        <VariableRow
          key={variable.key}
          variable={variable}
          onLabelChange={(label) => updateVariable(index, { label })}
          onDescriptionChange={(description) => updateVariable(index, { description })}
        />
      ))}
    </div>
  )
}

interface VariableRowProps {
  variable: TemplateVariable
  onLabelChange: (label: string) => void
  onDescriptionChange: (description: string | undefined) => void
}

function VariableRow({ variable, onLabelChange, onDescriptionChange }: VariableRowProps) {
  const labelId = `var-label-${variable.key}`
  const descId = `var-desc-${variable.key}`

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono text-foreground">
          {`{{${variable.key}}}`}
        </code>
        {variable.source === 'trigger' && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            auto
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={labelId} className="text-xs text-muted-foreground">
            Etykieta
          </Label>
          <Input
            id={labelId}
            value={variable.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={variable.key}
            className="h-7 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={descId} className="text-xs text-muted-foreground">
            Opis (opcjonalny)
          </Label>
          <Input
            id={descId}
            value={variable.description ?? ''}
            onChange={(e) => {
              const val = e.target.value
              onDescriptionChange(val.length > 0 ? val : undefined)
            }}
            placeholder="np. Imię klienta"
            className="h-7 text-xs"
          />
        </div>
      </div>
    </div>
  )
}
