'use client'

import { useEffect, useRef } from 'react'
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
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { sendEmailConfigSchema } from '../../validation'
import type { StepConfigSendEmail } from '../../types'
import type { ConfigPanelProps } from './index'

type SendEmailFormData = StepConfigSendEmail

export function SendEmailConfigPanel({ stepConfig, onChange, availableVariables, emailTemplates }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const toExpressionRef = useRef<HTMLInputElement>(null)

  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailConfigSchema),
    defaultValues: {
      type: 'send_email',
      template_id: (stepConfig?.template_id as string) ?? undefined,
      to_expression: (stepConfig?.to_expression as string) ?? undefined,
    },
  })

  // emailTemplates are pre-loaded from route loader — no useQuery needed

  // Watch all fields and propagate changes (skip initial mount to avoid false dirty state)
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(formValues)])

  const variables = availableVariables ?? []
  const templates = emailTemplates ?? []

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="space-y-1.5">
        <Label htmlFor="template-id" className="text-sm font-medium">
          {messages.workflows.editor.templateIdLabel}
        </Label>
        <Select
          value={formValues.template_id ?? ''}
          onValueChange={(value) => setValue('template_id', value || undefined, { shouldDirty: true })}
        >
          <SelectTrigger id="template-id">
            <SelectValue placeholder={messages.workflows.editor.templateIdPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.subject} ({tpl.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.template_id && (
          <p role="alert" className="text-xs text-destructive">
            {errors.template_id.message}
          </p>
        )}
      </div>

      {/* To expression */}
      <div className="space-y-1.5">
        <Label htmlFor="to-expression" className="text-sm font-medium">
          {messages.workflows.editor.toExpressionLabel}
        </Label>
        <Controller
          name="to_expression"
          control={control}
          render={({ field }) => (
            <Input
              id="to-expression"
              ref={toExpressionRef}
              placeholder={messages.workflows.editor.toExpressionPlaceholder}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={!!errors.to_expression}
              aria-describedby="to-expression-hint"
            />
          )}
        />
        <div className="flex items-center justify-between">
          <p id="to-expression-hint" className="text-xs text-muted-foreground">
            {messages.workflows.editor.toExpressionHint}
          </p>
          {variables.length > 0 && (
            <VariableInserter
              variables={variables}
              inputRef={toExpressionRef}
              onChange={(value) => setValue('to_expression', value, { shouldDirty: true })}
              currentValue={formValues.to_expression ?? ''}
            />
          )}
        </div>
        {errors.to_expression && (
          <p role="alert" className="text-xs text-destructive">
            {errors.to_expression.message}
          </p>
        )}
      </div>
    </div>
  )
}
