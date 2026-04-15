/**
 * QuestionField Component
 *
 * Renders a single survey question with appropriate input based on question type.
 * Integrates with React Hook Form for validation and state management.
 *
 * CRITICAL IMPLEMENTATION NOTES:
 * - ALL field types use Controller (not register) for reliable error display
 * - Controller's fieldState.error bypasses RHF's formState.errors proxy,
 *   which has known issues with dynamic UUID-keyed fields
 * - Checkbox arrays use Controller with array value handling
 * - RadioGroup uses Controller (shadcn/ui RadioGroup uses onValueChange)
 *
 * @module apps/website/features/survey/components/QuestionField
 */

import { Control, Controller } from 'react-hook-form'
import {
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  DatePicker,
} from '@agency/ui'
import { Link } from '@tanstack/react-router'
import type { Question, SurveyAnswers } from '../types'
import { messages } from '@/lib/messages'

interface QuestionFieldProps {
  question: Question
  control: Control<SurveyAnswers>
  /** Question number displayed as prefix */
  number?: number
}

/**
 * Inline error message component for consistency across field types
 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p
      id={`${id}-error`}
      className="text-sm text-destructive mt-1"
      role="alert"
    >
      {message}
    </p>
  )
}

export function QuestionField({
  question,
  control,
  number,
}: QuestionFieldProps) {
  const { id, type, question: text, required, options, placeholder } = question

  // Effective input type: semantic_role overrides type for rendering
  // Existing surveys may have type:'text' with semantic_role:'client_email'
  const inputType =
    question.semantic_role === 'client_email' ? 'email' :
    question.semantic_role === 'phone' ? 'tel' :
    type

  return (
    <div className="space-y-3">
      {/* Question Label — hidden for consent type (label is inside the checkbox card) */}
      {type !== 'consent' && (
        <Label htmlFor={id} className="text-base font-medium text-foreground">
          {number != null && (
            <span className="text-muted-foreground mr-2">{number}.</span>
          )}
          {text}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {/* TEXT / EMAIL / TEL - Controller for reliable error display */}
      {(inputType === 'text' || inputType === 'email' || inputType === 'tel') && (
        <Controller
          name={id}
          control={control}
          render={({ field, fieldState }) => (
            <div className="mt-4">
              <Input
                id={id}
                type={inputType}
                placeholder={placeholder}
                {...field}
                value={field.value as string}
                aria-invalid={fieldState.error ? 'true' : 'false'}
                aria-describedby={fieldState.error ? `${id}-error` : undefined}
                className={fieldState.error ? 'border-destructive' : ''}
              />
              <FieldError id={id} message={fieldState.error?.message} />
            </div>
          )}
        />
      )}

      {/* TEXTAREA - Controller for reliable error display */}
      {type === 'textarea' && (
        <Controller
          name={id}
          control={control}
          render={({ field, fieldState }) => (
            <div className="mt-4">
              <Textarea
                id={id}
                rows={4}
                placeholder={placeholder}
                {...field}
                value={field.value as string}
                aria-invalid={fieldState.error ? 'true' : 'false'}
                aria-describedby={fieldState.error ? `${id}-error` : undefined}
                className={fieldState.error ? 'border-destructive' : ''}
              />
              <FieldError id={id} message={fieldState.error?.message} />
            </div>
          )}
        />
      )}

      {/* SELECT - shadcn/ui Select with Controller */}
      {type === 'select' && (
        <Controller
          name={id}
          control={control}
          render={({ field, fieldState }) => (
            <div className="mt-4">
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={id}
                  aria-invalid={fieldState.error ? 'true' : 'false'}
                  aria-describedby={fieldState.error ? `${id}-error` : undefined}
                  className={fieldState.error ? 'border-destructive' : ''}
                >
                  <SelectValue
                    placeholder={
                      placeholder || messages.validation.selectPlaceholder
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id={id} message={fieldState.error?.message} />
            </div>
          )}
        />
      )}

      {/* RADIO - shadcn/ui RadioGroup with Controller */}
      {type === 'radio' && (
        <Controller
          name={id}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <RadioGroup
                value={field.value as string}
                onValueChange={field.onChange}
                aria-describedby={fieldState.error ? `${id}-error` : undefined}
                className="mt-4"
              >
                {options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`${id}-${option}`}
                      aria-invalid={fieldState.error ? 'true' : 'false'}
                    />
                    <Label
                      htmlFor={`${id}-${option}`}
                      className="text-sm font-normal text-foreground cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <FieldError id={id} message={fieldState.error?.message} />
            </>
          )}
        />
      )}

      {/* CHECKBOX - shadcn/ui Checkbox with Controller for array handling */}
      {type === 'checkbox' && (
        <Controller
          name={id}
          control={control}
          defaultValue={[]}
          render={({ field, fieldState }) => (
            <>
              <div
                className="space-y-2 mt-4"
                role="group"
                aria-describedby={fieldState.error ? `${id}-error` : undefined}
              >
                {options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${id}-${option}`}
                      checked={(field.value as string[])?.includes(option)}
                      onCheckedChange={(checked) => {
                        const values = (field.value as string[]) || []
                        field.onChange(
                          checked
                            ? [...values, option]
                            : values.filter((v) => v !== option)
                        )
                      }}
                      aria-invalid={fieldState.error ? 'true' : 'false'}
                    />
                    <Label
                      htmlFor={`${id}-${option}`}
                      className="text-sm font-normal text-foreground cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
              <FieldError id={id} message={fieldState.error?.message} />
            </>
          )}
        />
      )}

      {/* DATE - DatePicker (Controller) */}
      {type === 'date' && (
        <Controller
          name={id}
          control={control}
          render={({ field, fieldState }) => (
            <div className="mt-4">
              <DatePicker
                id={id}
                value={field.value ? new Date(field.value as string) : undefined}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                placeholder={placeholder || messages.survey.datePickerPlaceholder}
                error={!!fieldState.error}
                aria-describedby={fieldState.error ? `${id}-error` : undefined}
              />
              <FieldError id={id} message={fieldState.error?.message} />
            </div>
          )}
        />
      )}

      {/* CONSENT - required RODO checkbox with privacy policy link */}
      {type === 'consent' && (
        <Controller
          name={id}
          control={control}
          defaultValue=""
          render={({ field, fieldState }) => {
            const consentUrl = question.consent_url || '/polityka-prywatnosci'
            const isExternal = consentUrl.startsWith('http')

            return (
              <>
                <div
                  className={`flex items-start gap-3 rounded-md border p-4 bg-muted/30 mt-4 ${fieldState.error ? 'border-destructive' : 'border-border'}`}
                  aria-describedby={fieldState.error ? `${id}-error` : undefined}
                >
                  <Checkbox
                    id={id}
                    checked={field.value === 'true'}
                    onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                    aria-required="true"
                    aria-invalid={fieldState.error ? 'true' : 'false'}
                    className="mt-0.5 shrink-0"
                  />
                  <label htmlFor={id} className="text-sm leading-relaxed text-foreground cursor-pointer select-none">
                    {text}
                    {' '}
                    {isExternal ? (
                      <a
                        href={consentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {messages.survey.privacyPolicyLinkText}
                      </a>
                    ) : (
                      <Link
                        to={consentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {messages.survey.privacyPolicyLinkText}
                      </Link>
                    )}
                    <span className="text-destructive ml-1" aria-hidden="true">*</span>
                  </label>
                </div>
                <FieldError id={id} message={fieldState.error?.message} />
              </>
            )
          }}
        />
      )}
    </div>
  )
}
