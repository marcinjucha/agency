'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Label, Input, Textarea } from '@agency/ui'
import { messages } from '@/lib/messages'
import { aiActionConfigSchema } from '../../validation'
import type { StepConfigAiAction } from '../../types'
import type { ConfigPanelProps } from './index'

type AiActionFormData = StepConfigAiAction

export function AiActionConfigPanel({ stepConfig, onChange }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const {
    register,
    watch,
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
        <Textarea
          id="ai-prompt"
          rows={8}
          placeholder={messages.workflows.editor.promptPlaceholder}
          className="resize-y"
          {...register('prompt')}
          aria-required="true"
          aria-invalid={!!errors.prompt}
          aria-describedby={errors.prompt ? 'prompt-error' : undefined}
        />
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
