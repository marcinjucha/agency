
import { useEffect, useRef, type RefObject } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Label } from '@agency/ui'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { messages } from '@/lib/messages'
import { getSurveyLinkConfigSchema } from '../../validation'
import { STEP_MAP } from '../../step-registry'
import { resolveOutputSchema } from '../../utils/step-labels'
import type { StepConfigGetSurveyLink } from '../../types'
import type { ConfigPanelProps } from './index'

type GetSurveyLinkFormData = StepConfigGetSurveyLink

const outputFields = resolveOutputSchema(STEP_MAP['get_survey_link'].outputSchema)

export function GetSurveyLinkConfigPanel({ stepConfig, onChange, availableVariables }: ConfigPanelProps) {
  const m = messages.workflows.editor

  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const expressionInputRef = useRef<HTMLInputElement | null>(null)

  const variables = availableVariables ?? []
  const config = stepConfig as GetSurveyLinkFormData | undefined

  const { control, watch, setValue } = useForm<GetSurveyLinkFormData>({
    resolver: zodResolver(getSurveyLinkConfigSchema),
    defaultValues: {
      type: 'get_survey_link',
      surveyLinkIdExpression: config?.surveyLinkIdExpression ?? '{{surveyLinkId}}',
    },
  })

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
        {messages.workflows.stepLibrary.descGetSurveyLink}
      </p>

      {/* surveyLinkIdExpression */}
      <div className="space-y-1.5">
        <Label htmlFor="get-survey-link-id-expr" className="text-sm font-medium">
          {m.getSurveyLinkIdExpressionLabel}
        </Label>
        <p className="text-xs text-muted-foreground">
          {m.getSurveyLinkIdExpressionHint}
        </p>
        <div className="flex items-center gap-1">
          <Controller
            name="surveyLinkIdExpression"
            control={control}
            render={({ field: f }) => (
              <Input
                id="get-survey-link-id-expr"
                ref={(el) => {
                  expressionInputRef.current = el
                  f.ref(el)
                }}
                placeholder="{{surveyLinkId}}"
                value={f.value ?? ''}
                onChange={f.onChange}
                onBlur={f.onBlur}
                className="h-9 font-mono text-xs"
                aria-label={m.getSurveyLinkIdExpressionLabel}
              />
            )}
          />
          {variables.length > 0 && (
            <VariableInserter
              variables={variables}
              inputRef={expressionInputRef as RefObject<HTMLInputElement | null>}
              onChange={(value) =>
                setValue('surveyLinkIdExpression', value, { shouldDirty: true })
              }
              currentValue={formValues.surveyLinkIdExpression ?? ''}
            />
          )}
        </div>
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
