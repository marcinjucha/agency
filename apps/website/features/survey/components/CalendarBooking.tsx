import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Card } from '@agency/ui'
import { messages } from '@/lib/messages'
import { bookingFormSchema, type BookingFormData } from '../validation'
import type { CalendarSlot } from '../types'
import { BookingSuccess } from './BookingSuccess'
import { BookingForm } from './BookingForm'
import { DateSlotPicker } from './DateSlotPicker'
import { bookAppointmentFn } from '@/features/calendar/server'

interface CalendarBookingProps {
  surveyId: string
  responseId: string
}

export function CalendarBooking({ surveyId, responseId }: CalendarBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema as any),
    mode: 'onBlur',
  })

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedSlot) {
      setSubmitError(messages.calendar.selectTimeSlot)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await bookAppointmentFn({
        data: {
          surveyId,
          responseId,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          notes: data.notes || '',
        },
      })

      if (result.success) {
        setBookingSuccess(true)
      } else {
        setSubmitError(result.error.error || messages.calendar.bookingFailed)
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      setSubmitError(messages.calendar.unexpectedError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0">
            <div className="p-8 sm:p-12">
              <BookingSuccess date={selectedDate} slot={selectedSlot} />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl border-0">
          <div className="p-8 sm:p-12">
            {/* Header */}
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                {messages.calendar.bookAppointment}
              </h1>
              <p className="text-lg text-muted-foreground">
                {messages.calendar.selectConvenientTime}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <DateSlotPicker
                surveyId={surveyId}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onDateChange={setSelectedDate}
                onSlotSelect={setSelectedSlot}
              />

              {selectedSlot && (
                <BookingForm
                  register={register}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                />
              )}
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
