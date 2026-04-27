

import { useEffect, useRef, type RefObject } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { messages } from '@/lib/messages'
import { updateResponseConfigSchema } from '../../validation'
import { STEP_OUTPUT_SCHEMA_PRESETS } from '../../step-registry'
import type { StepConfigUpdateResponse } from '../../types'
import type { ConfigPanelProps } from './index'

type UpdateResponseFormData = StepConfigUpdateResponse

type TargetColumn = StepConfigUpdateResponse['field_mapping'][number]['target_column']

function getTargetColumnOptions(m: typeof messages.workflows.editor): Array<{ value: TargetColumn; label: string }> {
  return [
    { value: 'ai_qualification', label: m.updateResponseColAiQualification },
    { value: 'status',           label: m.updateResponseColStatus },
    { value: 'notes',            label: m.updateResponseColNotes },
    { value: 'respondent_name',  label: m.updateResponseColRespondentName },
  ]
}

const CUSTOM_PRESET_VALUE = 'custom'

export function UpdateResponseConfigPanel({ stepConfig, onChange, availableVariables }: ConfigPanelProps) {
  const m = messages.workflows.editor
  const targetColumnOptions = getTargetColumnOptions(m)

  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const variables = availableVariables ?? []
  const presets = STEP_OUTPUT_SCHEMA_PRESETS.update_response ?? []

  // Per-row input refs for VariableInserter (source_expression fields)
  const sourceExpressionRefs = useRef<Array<RefObject<HTMLInputElement | null>>>([])

  const existingMapping = (stepConfig?.field_mapping as UpdateResponseFormData['field_mapping']) ?? []

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateResponseFormData>({
    resolver: zodResolver(updateResponseConfigSchema),
    defaultValues: {
      type: 'update_response',
      field_mapping: existingMapping,
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'field_mapping',
  })

  // Keep per-row refs array in sync with field array length
  while (sourceExpressionRefs.current.length < fields.length) {
    sourceExpressionRefs.current.push({ current: null })
  }
  sourceExpressionRefs.current = sourceExpressionRefs.current.slice(0, fields.length)

  // Autosave: watch all fields, skip first render, debounce 300ms
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(formValues)])

  function handlePresetSelect(presetId: string) {
    if (presetId === CUSTOM_PRESET_VALUE) return

    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return

    // Map preset fields to field_mapping rows
    // For update_response preset "save_to_ai_qualification", we add one mapping row
    if (presetId === 'save_to_ai_qualification') {
      replace([{ target_column: 'ai_qualification', source_expression: '' }])
    } else {
      // Generic: map preset fields as best-effort target column matches
      replace(
        preset.fields
          .filter((f) =>
            targetColumnOptions.some((opt) => opt.value === f.key)
          )
          .map((f) => ({
            target_column: f.key as TargetColumn,
            source_expression: '',
          }))
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Preset selector */}
      <div className="space-y-1.5">
        <Label htmlFor="update-response-preset" className="text-sm font-medium">
          {m.updateResponsePresetLabel}
        </Label>
        <p className="text-xs text-muted-foreground">
          {m.updateResponsePresetHint}
        </p>
        <Select onValueChange={handlePresetSelect} defaultValue={CUSTOM_PRESET_VALUE}>
          <SelectTrigger id="update-response-preset" aria-label={m.updateResponsePresetAriaLabel}>
            <SelectValue placeholder={m.updateResponsePresetPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CUSTOM_PRESET_VALUE}>{m.updateResponsePresetCustom}</SelectItem>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.id === 'save_to_ai_qualification' ? m.updateResponsePresetSaveAiQual : preset.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <hr className="border-border" />

      {/* Field mapping list */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {m.updateResponseFieldMappingLabel}
        </Label>

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            {m.updateResponseNoMappings}
          </p>
        )}

        {fields.map((field, index) => {
          const rowErrors = errors.field_mapping?.[index]
          const ref = sourceExpressionRefs.current[index] ?? { current: null }

          return (
            <div
              key={field.id}
              className="flex items-start gap-2"
              role="group"
              aria-label={m.updateResponseMappingGroup(index + 1)}
            >
              {/* Target column */}
              <div className="flex-1 space-y-1">
                <Controller
                  name={`field_mapping.${index}.target_column`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      value={f.value}
                      onValueChange={(v) => f.onChange(v as TargetColumn)}
                    >
                      <SelectTrigger
                        aria-label={m.updateResponseTargetColAriaLabel(index + 1)}
                        aria-invalid={!!rowErrors?.target_column}
                        className="h-9"
                      >
                        <SelectValue placeholder={m.updateResponseTargetColPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {targetColumnOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Source expression */}
              <div className="flex-[2] space-y-1">
                <div className="flex items-center gap-1">
                  <Controller
                    name={`field_mapping.${index}.source_expression`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        ref={(el) => {
                          ref.current = el
                          f.ref(el)
                        }}
                        placeholder={m.updateResponseSourceExprPlaceholder}
                        value={f.value ?? ''}
                        onChange={f.onChange}
                        onBlur={f.onBlur}
                        className="h-9 font-mono text-xs"
                        aria-label={m.updateResponseSourceExprAriaLabel(index + 1)}
                        aria-invalid={!!rowErrors?.source_expression}
                        aria-describedby={rowErrors?.source_expression ? `source-expr-error-${index}` : undefined}
                      />
                    )}
                  />
                  {variables.length > 0 && (
                    <VariableInserter
                      variables={variables}
                      inputRef={ref as RefObject<HTMLInputElement | null>}
                      onChange={(value) =>
                        setValue(`field_mapping.${index}.source_expression`, value, {
                          shouldDirty: true,
                        })
                      }
                      currentValue={formValues.field_mapping?.[index]?.source_expression ?? ''}
                    />
                  )}
                </div>
                {rowErrors?.source_expression && (
                  <p
                    id={`source-expr-error-${index}`}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {rowErrors.source_expression.message}
                  </p>
                )}
              </div>

              {/* Delete row */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                aria-label={m.updateResponseDeleteMappingAriaLabel(index + 1)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-muted-foreground"
          onClick={() => append({ target_column: 'status', source_expression: '' })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {m.updateResponseAddMapping}
        </Button>
      </div>
    </div>
  )
}
