/**
 * Calendar Slot Calculator
 *
 * Pure functions for calculating available appointment slots.
 * Handles Warsaw timezone conversions, slot generation,
 * and busy-event overlap detection.
 *
 * @module apps/website/features/calendar/slot-calculator
 */

import type { TimeSlot } from './types'
import { parse, addMinutes } from 'date-fns'

const TIMEZONE = 'Europe/Warsaw'

/**
 * Get current UTC offset for Warsaw timezone.
 * Poland is UTC+1 (CET) in winter, UTC+2 (CEST) in summer.
 */
export function getWarsawUTCOffset(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const timeObj: Record<string, string> = {}
  parts.forEach(({ type, value }) => {
    timeObj[type] = value
  })

  const utcDate = new Date(
    Date.UTC(
      parseInt(timeObj.year),
      parseInt(timeObj.month) - 1,
      parseInt(timeObj.day),
      parseInt(timeObj.hour),
      parseInt(timeObj.minute),
      parseInt(timeObj.second)
    )
  )

  return (date.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

/**
 * Format date as ISO string with timezone offset
 */
export function formatISOWithTimezone(date: Date, tzOffset: number): string {
  const sign = tzOffset >= 0 ? '+' : '-'
  const absOffset = Math.abs(tzOffset)
  const hours = Math.floor(absOffset).toString().padStart(2, '0')
  const minutes = ((absOffset % 1) * 60).toString().padStart(2, '0')

  return date.toISOString().slice(0, -1) + sign + hours + ':' + minutes
}

/**
 * Validate and parse ISO date string (YYYY-MM-DD).
 * Throws if format is invalid.
 */
export function parseDateString(dateStr: string): Date {
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date())

  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  return parsed
}

/** Busy event shape used for overlap detection */
export interface BusyEvent {
  start: { dateTime: string }
  end: { dateTime: string }
}

/**
 * Check if a time slot overlaps with busy periods (including buffer)
 */
export function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  busyEvents: BusyEvent[],
  bufferMinutes: number
): boolean {
  const slotStartWithBuffer = addMinutes(slotStart, -bufferMinutes)
  const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes)

  for (const event of busyEvents) {
    const eventStart = new Date(event.start.dateTime)
    const eventEnd = new Date(event.end.dateTime)

    // Overlap: event starts before slot ends AND event ends after slot starts
    if (eventStart < slotEndWithBuffer && eventEnd > slotStartWithBuffer) {
      return false
    }
  }

  return true
}

/**
 * Calculate available slots for a day.
 *
 * Algorithm:
 * 1. Parse requested date
 * 2. Create work start/end times in Warsaw timezone
 * 3. Loop through slots in duration increments
 * 4. Check availability against busy events (with buffer)
 * 5. Return available slots as ISO strings
 */
export function calculateAvailableSlots(
  date: Date,
  busyEvents: BusyEvent[],
  workStartHour: number,
  workEndHour: number,
  slotDurationMinutes: number,
  bufferMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = []

  const tzOffset = getWarsawUTCOffset(date)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const dateObj: Record<string, string> = {}
  parts.forEach(({ type, value }) => {
    dateObj[type] = value
  })

  const workStartUTC = new Date(
    Date.UTC(
      parseInt(dateObj.year),
      parseInt(dateObj.month) - 1,
      parseInt(dateObj.day),
      workStartHour - tzOffset,
      0,
      0
    )
  )

  const workEndUTC = new Date(
    Date.UTC(
      parseInt(dateObj.year),
      parseInt(dateObj.month) - 1,
      parseInt(dateObj.day),
      workEndHour - tzOffset,
      0,
      0
    )
  )

  let currentTime = new Date(workStartUTC)

  while (currentTime < workEndUTC) {
    const slotStart = currentTime
    const slotEnd = addMinutes(slotStart, slotDurationMinutes)

    if (slotEnd > workEndUTC) {
      break
    }

    if (isSlotAvailable(slotStart, slotEnd, busyEvents, bufferMinutes)) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    currentTime = addMinutes(currentTime, slotDurationMinutes + bufferMinutes)
  }

  return slots
}

/**
 * Get the UTC start and end of a day in Warsaw timezone.
 * Used to query calendar events for a specific day.
 */
export function getDayBoundsUTC(date: Date): { dayStartUTC: Date; dayEndUTC: Date } {
  const tzOffset = getWarsawUTCOffset(date)
  const dayStartUTC = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(),
    -tzOffset, 0, 0
  )
  const dayEndUTC = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(),
    24 - tzOffset, 0, 0
  )
  return { dayStartUTC, dayEndUTC }
}
