import { Input } from '@agency/ui'
import type { TemplateVariable } from '../types'

interface VariablesEditorProps {
  variables: TemplateVariable[]
  onChange: (vars: TemplateVariable[]) => void
}

export function VariablesEditor({ variables, onChange }: VariablesEditorProps) {
  if (variables.length === 0) {
    return <VariablesEmptyState />
  }

  function updateVariable(index: number, patch: Partial<TemplateVariable>) {
    onChange(variables.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
      {variables.map((variable, index) => (
        <VariableRow
          key={variable.key}
          variable={variable}
          isFirst={index === 0}
          onLabelChange={(label) => updateVariable(index, { label })}
          onDescriptionChange={(description) => updateVariable(index, { description })}
        />
      ))}
    </div>
  )
}

function VariablesEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/20 px-6 py-8 text-center">
      <code className="inline-block rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-foreground/70">
        {'{{nazwa}}'}
      </code>
      <p className="mt-3 text-xs text-muted-foreground">
        Wstaw zmienną do treści szablonu, aby skonfigurować jej etykietę i opis.
      </p>
    </div>
  )
}

interface VariableRowProps {
  variable: TemplateVariable
  isFirst: boolean
  onLabelChange: (label: string) => void
  onDescriptionChange: (description: string | undefined) => void
}

function VariableRow({ variable, isFirst, onLabelChange, onDescriptionChange }: VariableRowProps) {
  return (
    <div
      className={`group flex items-center gap-2.5 bg-card/0 px-3 py-2 transition-colors hover:bg-card/60 focus-within:bg-card/60 ${
        isFirst ? '' : 'border-t border-border/40'
      }`}
    >
      <code className="shrink-0 rounded border border-primary/25 bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold text-primary">
        {`{{${variable.key}}}`}
      </code>

      <Input
        value={variable.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Etykieta"
        aria-label={`Etykieta zmiennej ${variable.key}`}
        className="h-8 min-w-0 flex-1 border-transparent bg-transparent text-xs placeholder:text-muted-foreground/60 focus-visible:border-border focus-visible:bg-background"
      />

      <Input
        value={variable.description ?? ''}
        onChange={(e) => {
          const val = e.target.value
          onDescriptionChange(val.length > 0 ? val : undefined)
        }}
        placeholder="Opis (opcjonalny)"
        aria-label={`Opis zmiennej ${variable.key}`}
        className="h-8 min-w-0 flex-1 border-transparent bg-transparent text-xs placeholder:text-muted-foreground/60 focus-visible:border-border focus-visible:bg-background"
      />

      {variable.source === 'trigger' && (
        <span
          className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60"
          title="Zmienna wykryta automatycznie z treści szablonu"
        >
          auto
        </span>
      )}
    </div>
  )
}
