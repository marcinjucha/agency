/**
 * QuestionField Component
 *
 * Renders a single survey question with appropriate input based on question type.
 * Integrates with React Hook Form for validation and state management.
 *
 * CRITICAL IMPLEMENTATION NOTES:
 * - Checkbox arrays MUST use Controller (register doesn't work for arrays)
 * - RadioGroup MUST use Controller (shadcn/ui RadioGroup uses onValueChange)
 * - All other input types use register
 * - Error handling includes visual feedback and accessibility attributes
 *
 * @module apps/website/features/survey/components/QuestionField
 */

'use client'

import { Control, Controller, UseFormRegister } from 'react-hook-form'
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
} from '@agency/ui'
import type { Question, SurveyAnswers } from '../types'
import { messages } from '@/lib/messages'

interface QuestionFieldProps {
  question: Question
  register: UseFormRegister<SurveyAnswers>
  control: Control<SurveyAnswers>
  error?: string
  /** Question number displayed as prefix */
  number?: number
}

export function QuestionField({
  question,
  register,
  control,
  error,
  number,
}: QuestionFieldProps) {
  const { id, type, question: text, required, options, placeholder } = question

  return (
    <div className="space-y-3">
      {/* Question Label */}
      <Label htmlFor={id} className="text-base font-medium text-foreground">
        {number != null && (
          <span className="text-muted-foreground mr-2">{number}.</span>
        )}
        {text}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {/* TEXT / EMAIL / TEL - Use Input component with register */}
      {(type === 'text' || type === 'email' || type === 'tel') && (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          {...register(id)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive' : ''}
        />
      )}

      {/* TEXTAREA - shadcn/ui Textarea with register */}
      {type === 'textarea' && (
        <Textarea
          id={id}
          rows={4}
          placeholder={placeholder}
          {...register(id)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive' : ''}
        />
      )}

      {/* SELECT - shadcn/ui Select with Controller */}
      {type === 'select' && (
        <Controller
          name={id}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value as string}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id={id}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${id}-error` : undefined}
                className={error ? 'border-destructive' : ''}
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
          )}
        />
      )}

      {/* RADIO - shadcn/ui RadioGroup with Controller */}
      {type === 'radio' && (
        <Controller
          name={id}
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value as string}
              onValueChange={field.onChange}
              aria-describedby={error ? `${id}-error` : undefined}
            >
              {options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option}
                    id={`${id}-${option}`}
                    aria-invalid={error ? 'true' : 'false'}
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
          )}
        />
      )}

      {/* CHECKBOX - shadcn/ui Checkbox with Controller for array handling */}
      {type === 'checkbox' && (
        <Controller
          name={id}
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div
              className="space-y-2"
              role="group"
              aria-describedby={error ? `${id}-error` : undefined}
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
                    aria-invalid={error ? 'true' : 'false'}
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
          )}
        />
      )}

      {/* DATE - Input with type="date" */}
      {type === 'date' && (
        <Input
          id={id}
          type="date"
          placeholder={placeholder || messages.survey.datePickerPlaceholder}
          {...register(id)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-destructive' : ''}
        />
      )}

      {/* Error Message - Linked to field for accessibility */}
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive mt-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
