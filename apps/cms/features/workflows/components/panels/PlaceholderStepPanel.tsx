import { useState } from 'react'
import {
  Badge,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@agency/ui'
import { PLACEHOLDER_STEP_MAP } from '../../step-registry'
import type { PlaceholderStepType } from '../../step-registry'
import { messages } from '@/lib/messages'
import type { ConfigPanelProps } from './index'

export function PlaceholderStepPanel({ stepType, stepConfig, onChange }: ConfigPanelProps) {
  const definition = PLACEHOLDER_STEP_MAP[stepType as PlaceholderStepType]

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of definition?.placeholderFields ?? []) {
      if (stepConfig?.[field.key] !== undefined) {
        initial[field.key] = String(stepConfig[field.key])
      } else if (field.type === 'select') {
        initial[field.key] = field.options?.[0] ?? ''
      } else {
        initial[field.key] = field.placeholder ?? ''
      }
    }
    return initial
  })

  if (!definition) return null

  function handleSelectChange(fieldKey: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    onChange({ ...stepConfig, [fieldKey]: value })
  }

  function handleInputChange(fieldKey: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    onChange({ ...stepConfig, [fieldKey]: value })
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          {messages.workflows.stepLibrary.badgeInPreparation}
        </Badge>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{definition.label}</h3>
          <p className="text-xs text-muted-foreground">{definition.description}</p>
        </div>
      </div>

      <hr className="border-border" />

      {/* Fields */}
      <div className="space-y-4">
        {definition.placeholderFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">{field.label}</Label>
            {field.type === 'select' ? (
              <Select
                value={fieldValues[field.key] ?? field.options?.[0] ?? ''}
                onValueChange={(val) => handleSelectChange(field.key, val)}
              >
                <SelectTrigger aria-label={field.label}>
                  <SelectValue placeholder={field.options?.[0] ?? '—'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type}
                value={fieldValues[field.key] ?? field.placeholder ?? ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                aria-label={field.label}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
