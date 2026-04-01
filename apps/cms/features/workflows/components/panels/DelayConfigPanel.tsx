'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agency/ui'
import { messages } from '@/lib/messages'
import { delayConfigSchema } from '../../validation'
import { type StepConfigDelay } from '../../types'
import type { ConfigPanelProps } from './index'

type DelayFormData = StepConfigDelay

type DelayPreset = { value: number; unit: 'minutes' | 'hours' | 'days'; label: string }

const PRESETS: DelayPreset[] = [
  { value: 5, unit: 'minutes', label: messages.workflows.editor.delayPreset5m },
  { value: 15, unit: 'minutes', label: messages.workflows.editor.delayPreset15m },
  { value: 1, unit: 'hours', label: messages.workflows.editor.delayPreset1h },
  { value: 24, unit: 'hours', label: messages.workflows.editor.delayPreset24h },
  { value: 3, unit: 'days', label: messages.workflows.editor.delayPreset72h },
]

const UNIT_OPTIONS: { value: 'minutes' | 'hours' | 'days'; label: string }[] = [
  { value: 'minutes', label: messages.workflows.editor.delayUnitMinutes },
  { value: 'hours', label: messages.workflows.editor.delayUnitHours },
  { value: 'days', label: messages.workflows.editor.delayUnitDays },
]

export function DelayConfigPanel({ stepConfig, onChange }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DelayFormData>({
    resolver: zodResolver(delayConfigSchema),
    defaultValues: {
      type: 'delay',
      value: (stepConfig?.value as number) ?? undefined,
      unit: (stepConfig?.unit as 'minutes' | 'hours' | 'days') ?? 'minutes',
    },
  })

  // Watch all fields and propagate changes (skip initial mount to avoid false dirty state)
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  const currentValue = formValues.value
  const currentUnit = formValues.unit

  function handlePresetClick(preset: DelayPreset) {
    setValue('value', preset.value, { shouldValidate: true, shouldDirty: true })
    setValue('unit', preset.unit, { shouldValidate: true, shouldDirty: true })
  }

  function isPresetActive(preset: DelayPreset) {
    return currentValue === preset.value && currentUnit === preset.unit
  }

  return (
    <div className="space-y-6">
      {/* Preset buttons */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.delayPresetsLabel}
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={`${preset.value}-${preset.unit}`}
              type="button"
              variant={isPresetActive(preset) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              aria-pressed={isPresetActive(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom value + unit */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.delayCustomLabel}
        </Label>
        <div className="flex gap-2">
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Input
                id="delay-value"
                type="number"
                min={1}
                placeholder={messages.workflows.editor.delayValuePlaceholder}
                value={field.value ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  field.onChange(val === '' ? undefined : Number(val))
                }}
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? 'delay-error' : undefined}
                className="flex-1"
              />
            )}
          />
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
              >
                <SelectTrigger className="w-32" aria-label={messages.workflows.editor.delayUnitLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {errors.value && (
          <p id="delay-error" role="alert" className="text-xs text-destructive">
            {errors.value.message}
          </p>
        )}
      </div>
    </div>
  )
}
