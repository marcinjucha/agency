'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { TRIGGER_VARIABLE_SCHEMAS } from '@/lib/trigger-schemas'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { getEmailTemplatesForWorkflow } from '../../queries'
import { sendEmailConfigSchema } from '../../validation'
import type { StepConfigSendEmail } from '../../types'
import type { ConfigPanelProps } from './index'

type SendEmailFormData = StepConfigSendEmail

export function SendEmailConfigPanel({ stepConfig, onChange, triggerType }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const toExpressionRef = useRef<HTMLInputElement>(null)

  const {
    register,
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

  const { data: templates, isLoading: isLoadingTemplates, isError: isErrorTemplates } = useQuery({
    queryKey: queryKeys.workflows.emailTemplates,
    queryFn: getEmailTemplatesForWorkflow,
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

  const variables = triggerType ? (TRIGGER_VARIABLE_SCHEMAS[triggerType] ?? []) : []

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
          disabled={isLoadingTemplates}
        >
          <SelectTrigger id="template-id">
            <SelectValue placeholder={isLoadingTemplates ? messages.common.loading : messages.workflows.editor.templateIdPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {templates?.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.subject} ({tpl.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isErrorTemplates && (
          <p role="alert" className="text-xs text-destructive">
            {messages.workflows.editor.templateLoadError}
          </p>
        )}
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
