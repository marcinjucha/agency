'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Label, Input } from '@agency/ui'
import { messages } from '@/lib/messages'
import { delayConfigSchema } from '../../validation'
import { DELAY_PRESETS, type StepConfigDelay } from '../../types'
import type { ConfigPanelProps } from './index'

type DelayFormData = StepConfigDelay

/** Map preset minutes to their display labels */
const PRESET_LABELS: Record<number, string> = {
  5: messages.workflows.editor.delayPreset5m,
  15: messages.workflows.editor.delayPreset15m,
  60: messages.workflows.editor.delayPreset1h,
  1440: messages.workflows.editor.delayPreset24h,
  4320: messages.workflows.editor.delayPreset72h,
}

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
      duration_minutes: (stepConfig?.duration_minutes as number) ?? undefined,
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
  }, [JSON.stringify(formValues)])

  const currentDuration = formValues.duration_minutes

  function handlePresetClick(minutes: number) {
    setValue('duration_minutes', minutes, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      {/* Preset buttons */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.durationMinutesLabel}
        </Label>
        <div className="flex flex-wrap gap-2">
          {DELAY_PRESETS.map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant={currentDuration === minutes ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(minutes)}
              aria-pressed={currentDuration === minutes}
            >
              {PRESET_LABELS[minutes] ?? `${minutes}m`}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom input */}
      <div className="space-y-1.5">
        <Label htmlFor="duration-custom" className="text-sm font-medium">
          {messages.workflows.editor.delayCustomLabel}
        </Label>
        <Controller
          name="duration_minutes"
          control={control}
          render={({ field }) => (
            <Input
              id="duration-custom"
              type="number"
              min={1}
              placeholder={messages.workflows.editor.durationMinutesPlaceholder}
              value={field.value ?? ''}
              onChange={(e) => {
                const val = e.target.value
                field.onChange(val === '' ? undefined : Number(val))
              }}
              aria-invalid={!!errors.duration_minutes}
              aria-describedby={errors.duration_minutes ? 'duration-error' : undefined}
            />
          )}
        />
        {errors.duration_minutes && (
          <p id="duration-error" role="alert" className="text-xs text-destructive">
            {errors.duration_minutes.message}
          </p>
        )}
      </div>
    </div>
  )
}
