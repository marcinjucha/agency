'use client'

import { useState } from 'react'
import { DatePicker, ErrorState, Label, LoadingState } from '@agency/ui'
import { startOfDay } from 'date-fns'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { TimeSlotsGrid } from './TimeSlotsGrid'
import type { CalendarSlot } from '../types'

interface DateSlotPickerProps {
  surveyId: string
  selectedDate: Date | null
  selectedSlot: CalendarSlot | null
  onDateChange: (date: Date | null) => void
  onSlotSelect: (slot: CalendarSlot) => void
}

export function DateSlotPicker({
  surveyId,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: DateSlotPickerProps) {
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [slots, setSlots] = useState<CalendarSlot[]>([])

  const handleDateChange = async (date: Date | undefined) => {
    if (!date) {
      onDateChange(null)
      return
    }

    onDateChange(date)
    setSlotsError(null)
    setSlotsLoading(true)

    try {
      const dateStr = date.toISOString().split('T')[0]
      const params = new URLSearchParams({ surveyId, date: dateStr })
      const response = await fetch(`${routes.api.calendarSlots}?${params.toString()}`)

      if (!response.ok) {
        setSlotsError(
          response.status === 404
            ? messages.calendar.calendarNotConnected
            : messages.calendar.loadTimesFailed
        )
        setSlots([])
        return
      }

      const data = await response.json()

      if (!data.slots || data.slots.length === 0) {
        setSlotsError(messages.calendar.noTimesAvailable)
        setSlots([])
      } else {
        setSlotsError(null)
        setSlots(data.slots)
      }
    } catch (error) {
      console.error('Error fetching calendar slots:', error)
      setSlotsError(messages.calendar.connectionError)
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  return (
    <>
      {/* STEP 1: Date Picker */}
      <div className="space-y-3">
        <Label htmlFor="appointment-date" className="text-base font-medium text-foreground">
          {messages.calendar.selectDate}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <DatePicker
          id="appointment-date"
          value={selectedDate ?? undefined}
          onChange={handleDateChange}
          placeholder={messages.calendar.selectDate}
          minDate={startOfDay(new Date())}
          aria-required="true"
          aria-describedby="date-help"
        />
        <p id="date-help" className="text-sm text-muted-foreground">
          {messages.calendar.selectDateHelp}
        </p>
      </div>

      {/* STEP 2: Time Slots (shown after date selected) */}
      {selectedDate && (
        <div className="space-y-3">
          <Label className="text-base font-medium text-foreground">
            {messages.calendar.selectTime}
            <span className="text-destructive ml-1">*</span>
          </Label>

          {slotsLoading && <LoadingState variant="skeleton-list" rows={6} />}

          {slotsError && (
            <ErrorState
              message={slotsError}
              variant="inline"
              title={messages.calendar.calendarError}
            />
          )}

          {!slotsLoading && slots.length > 0 && (
            <TimeSlotsGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={onSlotSelect}
            />
          )}

          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="text-muted-foreground py-6 text-center">
              {messages.calendar.noSlotsForDate}
            </p>
          )}
        </div>
      )}
    </>
  )
}
