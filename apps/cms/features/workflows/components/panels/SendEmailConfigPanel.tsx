

import { useEffect, useMemo, useRef, type RefObject } from 'react'
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
import { getEmailTemplatesForWorkflowFn } from '../../server'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { sendEmailConfigSchema } from '../../validation'
import type { StepConfigSendEmail, EmailTemplateWithBody } from '../../types'
import type { ConfigPanelProps } from './index'

type SendEmailFormData = StepConfigSendEmail

// ---------------------------------------------------------------------------
// Template variable extraction
// ---------------------------------------------------------------------------

/**
 * Extracts single-level {{var}} placeholders from an email template's html_body and subject.
 * Single-level only (no dots) — dot-notation would indicate a workflow variable reference,
 * not a template placeholder.
 */
function extractTemplateVars(html: string, subject: string): string[] {
  const pattern = /\{\{(\s*[\w]+\s*)\}\}/g
  const vars = new Set<string>()
  for (const match of [...html.matchAll(pattern), ...subject.matchAll(pattern)]) {
    vars.add(match[1].trim())
  }
  return [...vars].sort()
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VariableBindingTableProps {
  templateVars: string[]
  bindings: Record<string, string>
  onChange: (key: string, value: string) => void
  availableVariables: ConfigPanelProps['availableVariables']
}

function VariableBindingTable({
  templateVars,
  bindings,
  onChange,
  availableVariables,
}: VariableBindingTableProps) {
  const m = messages.workflows.editor
  const variables = availableVariables ?? []
  const inputRefs = useRef<Record<string, RefObject<HTMLInputElement | null>>>({})

  // Ensure a ref exists for each template var
  for (const key of templateVars) {
    if (!inputRefs.current[key]) {
      inputRefs.current[key] = { current: null }
    }
  }

  if (templateVars.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        {m.variableBindingsEmpty}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {templateVars.map((key) => {
        const ref = inputRefs.current[key] ?? { current: null }
        const currentValue = bindings[key] ?? ''

        return (
          <div
            key={key}
            className="flex items-center gap-2"
            role="group"
            aria-label={m.variableBindingInputAriaLabel(key)}
          >
            {/* Template variable name (read-only label) */}
            <div className="w-36 shrink-0">
              <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono text-foreground">
                {`{{${key}}}`}
              </code>
            </div>

            {/* Workflow expression input */}
            <div className="flex-1 flex items-center gap-1">
              <Input
                ref={(el) => { ref.current = el }}
                placeholder={m.variableBindingPlaceholder}
                value={currentValue}
                onChange={(e) => onChange(key, e.target.value)}
                className="h-9 font-mono text-xs"
                aria-label={m.variableBindingInputAriaLabel(key)}
              />
              {variables.length > 0 && (
                <VariableInserter
                  variables={variables}
                  inputRef={ref as RefObject<HTMLInputElement | null>}
                  onChange={(value) => onChange(key, value)}
                  currentValue={currentValue}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface VariableBindingsSectionProps {
  selectedTemplate: EmailTemplateWithBody | undefined
  bindings: Record<string, string>
  onBindingChange: (key: string, value: string) => void
  availableVariables: ConfigPanelProps['availableVariables']
}

function VariableBindingsSection({
  selectedTemplate,
  bindings,
  onBindingChange,
  availableVariables,
}: VariableBindingsSectionProps) {
  const m = messages.workflows.editor

  const templateVars = useMemo(() => {
    if (!selectedTemplate) return []
    return extractTemplateVars(selectedTemplate.html_body, selectedTemplate.subject)
  }, [selectedTemplate?.id, selectedTemplate?.html_body, selectedTemplate?.subject])

  if (!selectedTemplate) return null

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{m.variableBindingsLabel}</Label>
        <p className="text-xs text-muted-foreground">{m.variableBindingsHint}</p>
      </div>
      <VariableBindingTable
        templateVars={templateVars}
        bindings={bindings}
        onChange={onBindingChange}
        availableVariables={availableVariables}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function SendEmailConfigPanel({ stepConfig, onChange, availableVariables, isInvalid }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const toExpressionRef = useRef<HTMLInputElement>(null)

  const existingBindings = (stepConfig?.variable_bindings as Record<string, string>) ?? {}

  const {
    watch,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm<SendEmailFormData>({
    mode: 'onChange',
    resolver: zodResolver(sendEmailConfigSchema),
    defaultValues: {
      type: 'send_email',
      template_id: (stepConfig?.template_id as string) ?? undefined,
      to_expression: (stepConfig?.to_expression as string) ?? undefined,
      variable_bindings: existingBindings,
    },
  })

  // Cache pre-populated by the route loader's ensureQueryData — renders instantly.
  const { data: emailTemplates = [] } = useQuery({
    queryKey: queryKeys.workflows.emailTemplates,
    queryFn: async () => {
      const data = await getEmailTemplatesForWorkflowFn()
      return data
    },
  })

  // Trigger validation on mount when the step is already marked invalid (amber ring on canvas)
  // Empty deps array: fires exactly once after mount — intentional
  useEffect(() => {
    if (isInvalid) { void trigger() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Watch all fields and propagate changes (skip initial mount to avoid false dirty state)
  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [JSON.stringify(formValues)])

  const selectedTemplate = formValues.template_id
    ? emailTemplates.find((t) => t.id === formValues.template_id)
    : undefined

  const currentBindings = formValues.variable_bindings ?? {}

  function handleBindingChange(key: string, value: string) {
    const updated = { ...currentBindings, [key]: value }
    setValue('variable_bindings', updated, { shouldDirty: true })
  }

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
          <SelectTrigger
            id="template-id"
            aria-invalid={!!errors.template_id}
            aria-describedby={errors.template_id ? 'template-id-error' : undefined}
          >
            <SelectValue placeholder={messages.workflows.editor.templateIdPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {emailTemplates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.subject} ({tpl.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.template_id && (
          <p id="template-id-error" role="alert" className="text-xs text-destructive">
            {errors.template_id.message}
          </p>
        )}
      </div>

      {/* Variable bindings (shown only when a template is selected) */}
      <VariableBindingsSection
        selectedTemplate={selectedTemplate}
        bindings={currentBindings}
        onBindingChange={handleBindingChange}
        availableVariables={availableVariables}
      />

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
              aria-describedby={errors.to_expression ? 'to-expression-error' : 'to-expression-hint'}
            />
          )}
        />
        <div className="flex items-center justify-between">
          <p id="to-expression-hint" className="text-xs text-muted-foreground">
            {messages.workflows.editor.toExpressionHint}
          </p>
          {(availableVariables ?? []).length > 0 && (
            <VariableInserter
              variables={availableVariables ?? []}
              inputRef={toExpressionRef}
              onChange={(value) => setValue('to_expression', value, { shouldDirty: true })}
              currentValue={formValues.to_expression ?? ''}
            />
          )}
        </div>
        {errors.to_expression && (
          <p id="to-expression-error" role="alert" className="text-xs text-destructive">
            {errors.to_expression.message}
          </p>
        )}
      </div>
    </div>
  )
}
