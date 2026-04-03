'use client'

import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { Button, ErrorState, Input, Label, Textarea } from '@agency/ui'
import { Loader2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { CalendarSlot } from '../types'
import type { BookingFormData } from '../validation'

interface BookingFormProps {
  register: UseFormRegister<BookingFormData>
  errors: FieldErrors<BookingFormData>
  isSubmitting: boolean
  submitError: string | null
  selectedDate: Date | null
  selectedSlot: CalendarSlot
}

export function BookingForm({
  register,
  errors,
  isSubmitting,
  submitError,
  selectedDate,
  selectedSlot,
}: BookingFormProps) {
  return (
    <>
      {/* Selected appointment summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary">
          <strong>{messages.calendar.selectedAppointment}</strong>{' '}
          {selectedDate?.toLocaleDateString('pl-PL')} {messages.calendar.at}{' '}
          {new Date(selectedSlot.start).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-3">
          <Label htmlFor="client-name" className="text-base font-medium text-foreground">
            {messages.calendar.yourName}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="client-name"
            type="text"
            placeholder={messages.calendar.yourNamePlaceholder}
            {...register('clientName')}
            aria-required="true"
            aria-invalid={errors.clientName ? 'true' : 'false'}
            className={errors.clientName ? 'border-destructive' : ''}
          />
          {errors.clientName && (
            <p className="text-sm text-destructive" role="alert">
              {errors.clientName.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-3">
          <Label htmlFor="client-email" className="text-base font-medium text-foreground">
            {messages.calendar.emailAddress}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="client-email"
            type="email"
            placeholder={messages.calendar.emailPlaceholder}
            {...register('clientEmail')}
            aria-required="true"
            aria-invalid={errors.clientEmail ? 'true' : 'false'}
            className={errors.clientEmail ? 'border-destructive' : ''}
          />
          {errors.clientEmail && (
            <p className="text-sm text-destructive" role="alert">
              {errors.clientEmail.message}
            </p>
          )}
        </div>

        {/* Notes Field (Optional) */}
        <div className="space-y-3">
          <Label htmlFor="appointment-notes" className="text-base font-medium text-foreground">
            {messages.calendar.additionalNotes}
          </Label>
          <Textarea
            id="appointment-notes"
            rows={4}
            placeholder={messages.calendar.notesPlaceholder}
            {...register('notes')}
            className={errors.notes ? 'border-destructive' : ''}
            aria-invalid={errors.notes ? 'true' : 'false'}
          />
          {errors.notes && (
            <p className="text-sm text-destructive" role="alert">
              {errors.notes.message}
            </p>
          )}
        </div>
      </div>

      {submitError && (
        <ErrorState
          message={submitError}
          variant="inline"
          title={messages.calendar.bookingError}
        />
      )}

      <div className="pt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-lg font-semibold"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {messages.calendar.confirming}
            </span>
          ) : (
            messages.calendar.confirmAppointment
          )}
        </Button>
      </div>
    </>
  )
}
