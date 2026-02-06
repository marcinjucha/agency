/**
 * QuestionField Component
 *
 * Renders a single survey question with appropriate input based on question type.
 * Integrates with React Hook Form for validation and state management.
 *
 * CRITICAL IMPLEMENTATION NOTES:
 * - Checkbox arrays MUST use Controller (register doesn't work for arrays)
 * - All other input types use register
 * - Error handling includes visual feedback and accessibility attributes
 *
 * @module apps/website/features/survey/components/QuestionField
 */

'use client'

import { Control, Controller, UseFormRegister } from 'react-hook-form'
import { Input, Label } from '@agency/ui'
import type { Question, SurveyAnswers } from '../types'

interface QuestionFieldProps {
  question: Question
  register: UseFormRegister<SurveyAnswers>
  control: Control<SurveyAnswers>
  error?: string
}

export function QuestionField({
  question,
  register,
  control,
  error,
}: QuestionFieldProps) {
  const { id, type, question: text, required, options } = question

  return (
    <div className="space-y-3">
      {/* Question Label */}
      <Label htmlFor={id} className="text-base font-medium text-foreground">
        {text}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {/* TEXT / EMAIL / TEL - Use Input component with register */}
      {(type === 'text' || type === 'email' || type === 'tel') && (
        <Input
          id={id}
          type={type}
          {...register(id)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive' : ''}
        />
      )}

      {/* TEXTAREA - Native textarea with register */}
      {type === 'textarea' && (
        <textarea
          id={id}
          {...register(id)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
            error ? 'border-destructive' : 'border-border'
          }`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}

      {/* SELECT - Native select with placeholder */}
      {type === 'select' && (
        <select
          id={id}
          {...register(id)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
            error ? 'border-destructive' : 'border-border'
          }`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="">Select an option...</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {/* RADIO - Native radio buttons with register */}
      {type === 'radio' && (
        <div className="space-y-2" role="radiogroup" aria-describedby={error ? `${id}-error` : undefined}>
          {options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${id}-${option}`}
                value={option}
                {...register(id)}
                className="h-4 w-4 text-primary focus:ring-primary"
                aria-invalid={error ? 'true' : 'false'}
              />
              <label htmlFor={`${id}-${option}`} className="text-sm">
                {option}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* CHECKBOX - Use Controller for array handling (CRITICAL!) */}
      {type === 'checkbox' && (
        <Controller
          name={id}
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="space-y-2" role="group" aria-describedby={error ? `${id}-error` : undefined}>
              {options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${id}-${option}`}
                    value={option}
                    checked={(field.value as string[])?.includes(option)}
                    onChange={(e) => {
                      const currentValue = field.value as string[] | undefined
                      const values = currentValue || []
                      if (e.target.checked) {
                        field.onChange([...values, option])
                      } else {
                        field.onChange(values.filter((v) => v !== option))
                      }
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary rounded"
                    aria-invalid={error ? 'true' : 'false'}
                  />
                  <label htmlFor={`${id}-${option}`} className="text-sm">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          )}
        />
      )}

      {/* Error Message - Linked to field for accessibility */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
