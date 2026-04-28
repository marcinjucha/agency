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

export function PlaceholderStepPanel({ stepType }: ConfigPanelProps) {
  const definition = PLACEHOLDER_STEP_MAP[stepType as PlaceholderStepType]
  if (!definition) return null

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
              <Select disabled>
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
                placeholder={field.placeholder}
                disabled
                aria-label={field.label}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
