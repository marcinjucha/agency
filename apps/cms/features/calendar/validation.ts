import { z } from 'zod'
import { messages } from '@/lib/messages'

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
