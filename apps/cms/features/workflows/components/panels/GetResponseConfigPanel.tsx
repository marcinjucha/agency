
import { useEffect, useRef, type RefObject } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Label } from '@agency/ui'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { messages } from '@/lib/messages'
import { getResponseConfigSchema } from '../../validation'
import { STEP_MAP } from '../../step-registry'
import { resolveOutputSchema } from '../../utils/step-labels'
import type { StepConfigGetResponse } from '../../types'
import type { ConfigPanelProps } from './index'

type GetResponseFormData = StepConfigGetResponse

const outputFields = resolveOutputSchema(STEP_MAP['get_response'].outputSchema)

export function GetResponseConfigPanel({ stepConfig, onChange, availableVariables, isInvalid }: ConfigPanelProps) {
  const m = messages.workflows.editor

  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const expressionInputRef = useRef<HTMLInputElement | null>(null)

  const variables = availableVariables ?? []
  const config = stepConfig as GetResponseFormData | undefined

  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<GetResponseFormData>({
    mode: 'onChange',
    resolver: zodResolver(getResponseConfigSchema),
    defaultValues: {
      type: 'get_response',
      responseIdExpression: config?.responseIdExpression ?? '{{responseId}}',
    },
  })

  // Trigger validation on mount when the step is already marked invalid (amber ring on canvas)
  // Empty deps array: fires exactly once after mount — intentional
  useEffect(() => {
    if (isInvalid) { void trigger() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formValues = watch()
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const id = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(id)
  }, [JSON.stringify(formValues)])

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground">
        {m.getResponseDescription}
      </p>

      {/* responseIdExpression */}
      <div className="space-y-1.5">
        <Label htmlFor="get-response-id-expr" className="text-sm font-medium">
          {m.getResponseIdExpressionLabel}
        </Label>
        <p className="text-xs text-muted-foreground">
          {m.getResponseIdExpressionHint}
        </p>
        <div className="flex items-center gap-1">
          <Controller
            name="responseIdExpression"
            control={control}
            render={({ field: f }) => (
              <Input
                id="get-response-id-expr"
                ref={(el) => {
                  expressionInputRef.current = el
                  f.ref(el)
                }}
                placeholder={m.getResponseIdExpressionPlaceholder}
                value={f.value ?? ''}
                onChange={f.onChange}
                onBlur={f.onBlur}
                className="h-9 font-mono text-xs"
                aria-label={m.getResponseIdExpressionLabel}
                aria-invalid={!!errors.responseIdExpression}
                aria-describedby={errors.responseIdExpression ? 'get-response-id-expr-error' : undefined}
              />
            )}
          />
          {variables.length > 0 && (
            <VariableInserter
              variables={variables}
              inputRef={expressionInputRef as RefObject<HTMLInputElement | null>}
              onChange={(value) =>
                setValue('responseIdExpression', value, { shouldDirty: true })
              }
              currentValue={formValues.responseIdExpression ?? ''}
            />
          )}
        </div>
        {errors.responseIdExpression && (
          <p id="get-response-id-expr-error" role="alert" className="text-xs text-destructive">
            {errors.responseIdExpression.message}
          </p>
        )}
      </div>

      <hr className="border-border" />

      {/* Output fields list */}
      <div
        className="rounded-md border border-border bg-muted/30 p-3"
        role="region"
        aria-label={m.getResponseAvailableVars}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wide">
          {m.getResponseAvailableVars}
        </p>
        <ul className="space-y-2" aria-label={m.getResponseAvailableVars}>
          {outputFields.map(({ key, label, type }) => (
            <li key={key} className="flex items-start gap-2">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                {key}
              </code>
              <span className="flex-1 text-xs text-muted-foreground leading-relaxed">
                {label}
              </span>
              <span className="shrink-0 rounded bg-muted/60 px-1 py-0.5 text-xs font-mono text-muted-foreground">
                {type}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        {m.getResponseVarHintBefore}{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
          {'{{stepId.fieldName}}'}
        </code>
        {' '}{m.getResponseVarHintAfter}
      </p>
    </div>
  )
}
