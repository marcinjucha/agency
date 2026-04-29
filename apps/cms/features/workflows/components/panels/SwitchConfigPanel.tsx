import { useEffect, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label, Textarea } from '@agency/ui'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { VariableInserter } from '@/features/email/components/VariableInserter'
import { switchConfigSchema } from '../../validation'
import type { StepConfigSwitch } from '../../types'
import type { ConfigPanelProps } from './index'

type SwitchFormData = StepConfigSwitch

const DEFAULT_BRANCHES: StepConfigSwitch['branches'] = [
  { id: 'tak', label: 'Tak', expression: '' },
  { id: 'default', label: 'Pozostałe', expression: 'default' },
]

function isDefaultBranch(expression: string): boolean {
  return expression.trim() === 'default'
}

export function SwitchConfigPanel({ stepConfig, onChange, availableVariables, isInvalid }: ConfigPanelProps) {
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const variables = availableVariables ?? []

  // Keep per-branch expression textarea refs for VariableInserter
  const expressionRefs = useRef<Map<number, HTMLTextAreaElement | null>>(new Map())

  const rawBranches = stepConfig?.branches
  const initialBranches =
    Array.isArray(rawBranches) && rawBranches.length >= 2
      ? (rawBranches as StepConfigSwitch['branches'])
      : DEFAULT_BRANCHES

  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SwitchFormData>({
    mode: 'onChange',
    resolver: zodResolver(switchConfigSchema),
    defaultValues: {
      type: 'switch',
      branches: initialBranches,
    },
  })

  const { fields, insert, remove, move } = useFieldArray({
    control,
    name: 'branches',
  })

  const formValues = watch()

  // Trigger validation on mount when the step is already marked invalid (amber ring on canvas)
  // Empty deps array: fires exactly once after mount — intentional
  useEffect(() => {
    if (isInvalid) { void trigger() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced propagation — skip first render to avoid false dirty state
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      onChangeRef.current(formValues as Record<string, unknown>)
    }, 300)
    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  function handleAddBranch() {
    // Insert before the default branch (always last)
    const insertIndex = fields.length - 1
    insert(insertIndex, { id: `branch_${Date.now().toString(36)}`, label: 'Nowa gałąź', expression: '' })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    move(index, index - 1)
  }

  function handleMoveDown(index: number) {
    const defaultIndex = fields.length - 1
    if (index >= defaultIndex - 1) return // can't move into or past default
    move(index, index + 1)
  }

  const branchErrors = errors.branches

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {messages.workflows.editor.switchFirstMatchWins}
      </p>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          {messages.workflows.editor.switchBranchesLabel}
        </Label>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const isDefault = isDefaultBranch(field.expression)
            const branchError = Array.isArray(branchErrors) ? branchErrors[index] : undefined

            return (
              <div key={field.id}>
                <div className="flex items-start gap-2">
                  {/* Reorder buttons — only for non-default branches */}
                  {!isDefault ? (
                    <div className="flex flex-col gap-0.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        aria-label="Przesuń gałąź w górę"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(index)}
                        disabled={index >= fields.length - 2}
                        aria-label="Przesuń gałąź w dół"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    /* Spacer to align default branch with non-default branches */
                    <div className="w-6" aria-hidden="true" />
                  )}

                  {/* Branch fields */}
                  <div className="flex-1 space-y-1.5">
                    {/* Label input */}
                    <Controller
                      name={`branches.${index}.label`}
                      control={control}
                      render={({ field: labelField }) => (
                        <Input
                          id={`branch-label-${index}`}
                          placeholder={messages.workflows.editor.switchBranchLabel}
                          value={labelField.value}
                          onChange={labelField.onChange}
                          onBlur={labelField.onBlur}
                          aria-label={`${messages.workflows.editor.switchBranchLabel} — gałąź ${index + 1}`}
                          aria-invalid={!!branchError?.label}
                          aria-describedby={branchError?.label ? `branch-label-error-${index}` : undefined}
                        />
                      )}
                    />
                    {branchError?.label && (
                      <p
                        id={`branch-label-error-${index}`}
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {branchError.label.message}
                      </p>
                    )}

                    {/* Branch ID (readonly, shown as hint) */}
                    <p className="font-mono text-xs text-muted-foreground">
                      {messages.workflows.editor.switchBranchId}: {field.id}
                    </p>

                    {/* Expression field */}
                    {isDefault ? (
                      <Input
                        value={messages.workflows.editor.switchDefaultBranch}
                        disabled
                        aria-label="Wyrażenie gałęzi default"
                        className="text-muted-foreground"
                      />
                    ) : (
                      <div className="space-y-1">
                        <Controller
                          name={`branches.${index}.expression`}
                          control={control}
                          render={({ field: exprField }) => (
                            <Textarea
                              id={`branch-expression-${index}`}
                              ref={(el) => { expressionRefs.current.set(index, el) }}
                              rows={2}
                              placeholder={messages.workflows.editor.switchBranchExpressionPlaceholder}
                              className="resize-y font-mono text-sm"
                              value={exprField.value ?? ''}
                              onChange={exprField.onChange}
                              onBlur={exprField.onBlur}
                              aria-label={`${messages.workflows.editor.switchBranchExpression} — gałąź ${index + 1}`}
                              aria-invalid={!!branchError?.expression}
                              aria-describedby={branchError?.expression ? `branch-expression-error-${index}` : `branch-expression-hint-${index}`}
                            />
                          )}
                        />
                        <p id={`branch-expression-hint-${index}`} className="text-xs text-muted-foreground">
                          {messages.workflows.editor.switchBranchExpressionHint}
                        </p>
                        {variables.length > 0 && (
                          <VariableInserter
                            variables={variables}
                            inputRef={{ current: expressionRefs.current.get(index) ?? null }}
                            onChange={(value) =>
                              setValue(`branches.${index}.expression`, value, { shouldDirty: true })
                            }
                            currentValue={formValues.branches?.[index]?.expression ?? ''}
                          />
                        )}
                        {branchError?.expression && (
                          <p
                            id={`branch-expression-error-${index}`}
                            role="alert"
                            className="text-xs text-destructive"
                          >
                            {branchError.expression.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove button — disabled/hidden for default branch */}
                  {!isDefault ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      aria-label={`Usuń gałąź ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mt-1"
                      disabled
                      aria-hidden="true"
                      tabIndex={-1}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Separator between branches */}
                {index < fields.length - 1 && (
                  <hr className="border-border mt-3" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add branch button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddBranch}
      >
        {messages.workflows.editor.switchAddBranch}
      </Button>
    </div>
  )
}
