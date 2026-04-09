import { z } from 'zod'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// CalDAV Connection
// ---------------------------------------------------------------------------

export const caldavConnectionSchema = z.object({
  serverUrl: z.string().url('Podaj poprawny URL serwera CalDAV'),
  username: z.string().min(1, 'Nazwa użytkownika jest wymagana'),
  password: z.string().min(1, 'Hasło jest wymagane'),
  displayName: z.string().min(1, 'Nazwa połączenia jest wymagana').max(100),
})

export type CaldavConnectionSchema = z.infer<typeof caldavConnectionSchema>

// ---------------------------------------------------------------------------
// Calendar Settings (work hours, slot duration, buffer)
// ---------------------------------------------------------------------------

export const calendarSettingsSchema = z
  .object({
    work_start_hour: z.number().int().min(0).max(23),
    work_end_hour: z.number().int().min(0).max(23),
    slot_duration_minutes: z.number().int().min(15).max(480),
    buffer_minutes: z.number().int().min(0).max(120),
  })
  .refine((data) => data.work_end_hour > data.work_start_hour, {
    message: messages.validation.endHourAfterStart,
    path: ['work_end_hour'],
  })

export type CalendarSettingsSchema = z.infer<typeof calendarSettingsSchema>
