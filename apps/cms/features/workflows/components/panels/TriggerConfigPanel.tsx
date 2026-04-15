'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { getSurveysForWorkflowFn } from '../../server'
import {
  TRIGGER_TYPE_OPTIONS,
  type TriggerType,
} from '../../types'
import {
  triggerConfigSurveySubmittedSchema,
  triggerConfigBookingCreatedSchema,
  triggerConfigLeadScoredSchema,
  triggerConfigManualSchema,
  triggerConfigScheduledSchema,
} from '../../validation'
import type { ZodSchema } from 'zod'
import type { ConfigPanelProps } from './index'

const triggerSchemaMap: Record<TriggerType, ZodSchema> = {
  survey_submitted: triggerConfigSurveySubmittedSchema,
  booking_created: triggerConfigBookingCreatedSchema,
  lead_scored: triggerConfigLeadScoredSchema,
  manual: triggerConfigManualSchema,
  scheduled: triggerConfigScheduledSchema,
}

/**
 * Flat form type for trigger config — avoids discriminated union issues with RHF.
 * Only the relevant fields are used based on currentType.
 */
interface TriggerFormValues {
  type: TriggerType
  survey_id?: string | null
  min_score?: number | null
}

export function TriggerConfigPanel({ stepConfig, onChange }: ConfigPanelProps) {
  const currentType = (stepConfig?.type as TriggerType) || 'manual'
  const schema = triggerSchemaMap[currentType] ?? triggerConfigManualSchema

  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const {
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<TriggerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: currentType,
      survey_id: (stepConfig?.survey_id as string) ?? undefined,
      min_score: (stepConfig?.min_score as number) ?? undefined,
    },
  })

  // Cache pre-populated by the route loader's ensureQueryData — renders instantly.
  const { data: surveys = [] } = useQuery({
    queryKey: queryKeys.workflows.surveys,
    queryFn: async () => {
      const data = await getSurveysForWorkflowFn()
      return data
    },
  })

  // Watch all fields and propagate changes (skip initial mount to avoid false dirty state)
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as unknown as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(formValues)])

  function handleTriggerTypeChange(newType: TriggerType) {
    const newConfig: TriggerFormValues = { type: newType }
    reset(newConfig)
    onChange(newConfig as unknown as Record<string, unknown>, newType)
  }

  return (
    <div className="space-y-6">
      {/* Trigger Type Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="trigger-type" className="text-sm font-medium">
          {messages.workflows.editor.triggerTypeLabel}
        </Label>
        <Select
          value={currentType}
          onValueChange={(value) => handleTriggerTypeChange(value as TriggerType)}
        >
          <SelectTrigger id="trigger-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional fields based on trigger type */}
      {currentType === 'survey_submitted' && (
        <div className="space-y-1.5">
          <Label htmlFor="survey-id" className="text-sm font-medium">
            {messages.workflows.editor.surveyIdLabel}
          </Label>
          <Controller
            name="survey_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => field.onChange(value || undefined)}
              >
                <SelectTrigger id="survey-id" aria-invalid={!!errors.survey_id} aria-describedby={errors.survey_id ? 'survey-id-error' : undefined}>
                  <SelectValue placeholder={messages.workflows.editor.surveyIdPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.survey_id && (
            <p id="survey-id-error" role="alert" className="text-xs text-destructive">
              {errors.survey_id.message}
            </p>
          )}
        </div>
      )}

      {currentType === 'lead_scored' && (
        <div className="space-y-1.5">
          <Label htmlFor="min-score" className="text-sm font-medium">
            {messages.workflows.editor.minScoreLabel}
          </Label>
          <Controller
            name="min_score"
            control={control}
            render={({ field }) => (
              <Input
                id="min-score"
                type="number"
                min={1}
                placeholder={messages.workflows.editor.minScorePlaceholder}
                value={field.value ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  field.onChange(val === '' ? null : Number(val))
                }}
                aria-invalid={!!errors.min_score}
                aria-describedby={errors.min_score ? 'min-score-error' : undefined}
              />
            )}
          />
          {errors.min_score && (
            <p id="min-score-error" role="alert" className="text-xs text-destructive">
              {errors.min_score.message}
            </p>
          )}
        </div>
      )}

      {(currentType === 'booking_created' || currentType === 'manual' || currentType === 'scheduled') && (
        <p className="text-sm text-muted-foreground">
          {messages.workflows.editor.triggerNoExtraConfig}
        </p>
      )}
    </div>
  )
}
