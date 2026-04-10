'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { Button, Label, Input, Textarea } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { aiActionConfigSchema } from '../../validation'
import { STEP_OUTPUT_SCHEMAS } from '../../types'
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
      output_schema: (stepConfig?.output_schema as AiActionFormData['output_schema']) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'output_schema',
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

  const defaultFields = STEP_OUTPUT_SCHEMAS.ai_action
  const hasCustomFields = fields.length > 0

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

      {/* Output Schema */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.outputFields}
        </Label>

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2" role="group" aria-label={`${messages.workflows.editor.outputFields} ${index + 1}`}>
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={messages.workflows.editor.outputFieldKey}
                aria-label={`${messages.workflows.editor.outputFieldKey} ${index + 1}`}
                {...register(`output_schema.${index}.key`)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={messages.workflows.editor.outputFieldLabel}
                aria-label={`${messages.workflows.editor.outputFieldLabel} ${index + 1}`}
                {...register(`output_schema.${index}.label`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
              aria-label={messages.workflows.editor.removeOutputField}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => append({ key: '', label: '', type: 'string' })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {messages.workflows.editor.addOutputField}
        </Button>

        {!hasCustomFields && (
          <p className="text-xs italic text-muted-foreground">
            {messages.workflows.editor.defaultOutputFieldsHint}
          </p>
        )}

        {hasCustomFields && defaultFields.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Domyślne pola ({defaultFields.map(f => f.key).join(', ')}) zostaną zastąpione.
          </p>
        )}
      </div>
    </div>
  )
}
