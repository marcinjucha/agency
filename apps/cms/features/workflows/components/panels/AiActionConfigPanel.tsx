'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Label, Input, Textarea } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { aiActionConfigSchema } from '../../validation'
import type { StepConfigAiAction } from '../../types'
import type { ConfigPanelProps } from './index'

type AiActionFormData = StepConfigAiAction

export function AiActionConfigPanel({ stepConfig, onChange, availableVariables }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const promptRef = useRef<HTMLTextAreaElement>(null)
  const variables = availableVariables ?? []

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AiActionFormData>({
    resolver: zodResolver(aiActionConfigSchema),
    defaultValues: {
      type: 'ai_action',
      prompt: (stepConfig?.prompt as string) ?? '',
      model: (stepConfig?.model as string) ?? undefined,
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

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-prompt" className="text-sm font-medium">
          {messages.workflows.editor.promptLabel}
        </Label>
        <Controller
          name="prompt"
          control={control}
          render={({ field }) => (
            <Textarea
              id="ai-prompt"
              ref={promptRef}
              rows={8}
              placeholder={messages.workflows.editor.promptPlaceholder}
              className="resize-y"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-required="true"
              aria-invalid={!!errors.prompt}
              aria-describedby={errors.prompt ? 'prompt-error' : undefined}
            />
          )}
        />
        {variables.length > 0 && (
          <div className="flex justify-end">
            <VariableInserter
              variables={variables}
              inputRef={promptRef}
              onChange={(value) => setValue('prompt', value, { shouldDirty: true })}
              currentValue={formValues.prompt ?? ''}
            />
          </div>
        )}
        {errors.prompt && (
          <p id="prompt-error" role="alert" className="text-xs text-destructive">
            {errors.prompt.message}
          </p>
        )}
      </div>

      {/* Model (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-model" className="text-sm font-medium">
          {messages.workflows.editor.modelLabel}
        </Label>
        <Input
          id="ai-model"
          placeholder={messages.workflows.editor.modelPlaceholder}
          {...register('model')}
        />
      </div>
    </div>
  )
}
