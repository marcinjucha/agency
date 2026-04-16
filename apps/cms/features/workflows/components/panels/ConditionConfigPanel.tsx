

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Label, Textarea } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { conditionConfigSchema } from '../../validation'
import type { StepConfigCondition } from '../../types'
import type { ConfigPanelProps } from './index'

type ConditionFormData = StepConfigCondition

export function ConditionConfigPanel({ stepConfig, onChange, availableVariables }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const expressionRef = useRef<HTMLTextAreaElement>(null)
  const variables = availableVariables ?? []

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConditionFormData>({
    resolver: zodResolver(conditionConfigSchema),
    defaultValues: {
      type: 'condition',
      expression: (stepConfig?.expression as string) ?? '',
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
      <div className="space-y-1.5">
        <Label htmlFor="expression" className="text-sm font-medium">
          {messages.workflows.editor.expressionLabel}
        </Label>
        <Controller
          name="expression"
          control={control}
          render={({ field }) => (
            <Textarea
              id="expression"
              ref={expressionRef}
              rows={4}
              placeholder={messages.workflows.editor.expressionPlaceholder}
              className="resize-y font-mono text-sm"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-required="true"
              aria-invalid={!!errors.expression}
              aria-describedby={errors.expression ? 'expression-error' : 'expression-hint'}
            />
          )}
        />
        <div className="flex items-center justify-between">
          <p id="expression-hint" className="text-xs text-muted-foreground">
            {messages.workflows.editor.expressionHint}
          </p>
          {variables.length > 0 && (
            <VariableInserter
              variables={variables}
              inputRef={expressionRef}
              onChange={(value) => setValue('expression', value, { shouldDirty: true })}
              currentValue={formValues.expression ?? ''}
            />
          )}
        </div>
        {errors.expression && (
          <p id="expression-error" role="alert" className="text-xs text-destructive">
            {errors.expression.message}
          </p>
        )}
      </div>
    </div>
  )
}
