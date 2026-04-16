

import { useEffect, useCallback, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Plus, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { webhookConfigSchema } from '../../validation'
import { HTTP_METHODS, type HttpMethod } from '../../types'
import type { ConfigPanelProps } from './index'
import { z } from 'zod'

/**
 * Internal form schema with headers as array of key-value pairs.
 * The Zod webhookConfigSchema expects Record<string, string>,
 * so we convert on output.
 */
const webhookFormSchema = z.object({
  type: z.literal('webhook'),
  url: z.string().url(messages.validation.webhookUrlInvalid).min(1, messages.validation.webhookUrlRequired),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
})

type WebhookFormData = z.infer<typeof webhookFormSchema>

/** Convert Record<string, string> to array of {key, value} pairs */
function headersToArray(headers?: Record<string, string> | null): { key: string; value: string }[] {
  if (!headers || typeof headers !== 'object') return []
  return Object.entries(headers).map(([key, value]) => ({ key, value }))
}

/** Convert array of {key, value} pairs to Record<string, string> */
function arrayToHeaders(arr: { key: string; value: string }[]): Record<string, string> | null {
  const filtered = arr.filter((h) => h.key.trim() !== '')
  if (filtered.length === 0) return null
  return Object.fromEntries(filtered.map((h) => [h.key, h.value]))
}

export function WebhookConfigPanel({ stepConfig, onChange, availableVariables }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const urlRef = useRef<HTMLInputElement>(null)
  const variables = availableVariables ?? []

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      type: 'webhook',
      url: (stepConfig?.url as string) ?? '',
      method: (stepConfig?.method as HttpMethod) ?? 'POST',
      headers: headersToArray(stepConfig?.headers as Record<string, string> | null),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'headers',
  })

  // Watch all fields and propagate changes (skip initial mount to avoid false dirty state)
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      const output: Record<string, unknown> = {
        type: 'webhook',
        url: formValues.url,
        method: formValues.method,
        headers: arrayToHeaders(formValues.headers ?? []),
      }
      onChangeRef.current(output)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(formValues)])

  const handleAddHeader = useCallback(() => {
    append({ key: '', value: '' })
  }, [append])

  return (
    <div className="space-y-6">
      {/* URL */}
      <div className="space-y-1.5">
        <Label htmlFor="webhook-url" className="text-sm font-medium">
          {messages.workflows.editor.urlLabel}
        </Label>
        <Controller
          name="url"
          control={control}
          render={({ field }) => (
            <Input
              id="webhook-url"
              ref={urlRef}
              placeholder={messages.workflows.editor.urlPlaceholder}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-required="true"
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? 'url-error' : undefined}
            />
          )}
        />
        {variables.length > 0 && (
          <div className="flex justify-end">
            <VariableInserter
              variables={variables}
              inputRef={urlRef}
              onChange={(value) => setValue('url', value, { shouldDirty: true })}
              currentValue={formValues.url ?? ''}
            />
          </div>
        )}
        {errors.url && (
          <p id="url-error" role="alert" className="text-xs text-destructive">
            {errors.url.message}
          </p>
        )}
      </div>

      {/* Method */}
      <div className="space-y-1.5">
        <Label htmlFor="webhook-method" className="text-sm font-medium">
          {messages.workflows.editor.methodLabel}
        </Label>
        <Select
          value={formValues.method}
          onValueChange={(value) => setValue('method', value as HttpMethod, { shouldDirty: true })}
        >
          <SelectTrigger id="webhook-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.method && (
          <p role="alert" className="text-xs text-destructive">
            {errors.method.message}
          </p>
        )}
      </div>

      {/* Headers: key-value pair editor */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.headersLabel}
        </Label>

        {fields.length > 0 && (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder={messages.workflows.editor.headerKeyPlaceholder}
                  className="flex-1"
                  {...register(`headers.${index}.key`)}
                  aria-label={`${messages.workflows.editor.headerKeyPlaceholder} ${index + 1}`}
                />
                <Input
                  placeholder={messages.workflows.editor.headerValuePlaceholder}
                  className="flex-1"
                  {...register(`headers.${index}.value`)}
                  aria-label={`${messages.workflows.editor.headerValuePlaceholder} ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                  aria-label={`${messages.workflows.editor.removeHeader} ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddHeader}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {messages.workflows.editor.addHeader}
        </Button>
      </div>
    </div>
  )
}
